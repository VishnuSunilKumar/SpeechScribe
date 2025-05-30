const resultElement = document.getElementById("result");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

let recognition;
let isListening = false;
let shouldRestart = true; // New flag to control auto-restart

// Initialize the app
function init() {
    setupEventListeners();
    updateUI();
    updateStatus("Ready to start", "ready");
}

function setupEventListeners() {
    startBtn.addEventListener("click", startConverting);
    stopBtn.addEventListener("click", stopConverting);
    copyBtn.addEventListener("click", copyText);
    clearBtn.addEventListener("click", clearText);
}

async function startConverting() {
    try {
        // First request microphone permission explicitly
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        
        // Check for speech recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in your browser. Please try Chrome or Edge.");
            return;
        }

        recognition = new SpeechRecognition();
        setupRecognition(recognition);
        
        recognition.start();
        isListening = true;
        shouldRestart = true; // Enable auto-restart
        updateUI();
        updateStatus("Listening...", "listening");
    } catch (error) {
        console.error("Error:", error);
        updateStatus("Microphone access denied", "error");
        
        // Provide user feedback about the error
        if (error.name === 'NotAllowedError') {
            alert("Please allow microphone access to use this feature.");
        } else {
            alert("An error occurred: " + error.message);
        }
    }
}

function setupRecognition(recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = function(event) {
        const { finalTranscript, interTranscript } = processResult(event.results);
        resultElement.innerHTML = finalTranscript + '<span style="color: #999;">' + interTranscript + '</span>';
        
        // Auto-scroll to bottom
        resultElement.scrollTop = resultElement.scrollHeight;
    };

    recognition.onerror = function(event) {
        console.error("Recognition error:", event.error);
        
        if (event.error === 'no-speech') {
            updateStatus("No speech detected", "warning");
        } else if (event.error === 'audio-capture') {
            updateStatus("No microphone found", "error");
            isListening = false;
            shouldRestart = false;
            updateUI();
        } else if (event.error === 'not-allowed') {
            updateStatus("Permission denied", "error");
            isListening = false;
            shouldRestart = false;
            updateUI();
        } else {
            updateStatus("Error: " + event.error, "error");
            // Don't stop listening for other errors, let onend handle restart
        }
    };

    recognition.onend = function() {
        if (isListening && shouldRestart) {
            // If we're still supposed to be listening, restart recognition
            try {
                recognition.start();
            } catch (error) {
                console.error("Error restarting recognition:", error);
                isListening = false;
                shouldRestart = false;
                updateUI();
                updateStatus("Error occurred", "error");
            }
        } else {
            // Recognition ended intentionally or due to error
            isListening = false;
            updateUI();
            updateStatus("Ready to start", "ready");
        }
    };
}

function processResult(results) {
    let finalTranscript = '';
    let interTranscript = '';

    for (let i = 0; i < results.length; i++) {
        let transcript = results[i][0].transcript;
        
        // Capitalize the first letter of each sentence
        if (finalTranscript === '' || /[.!?]\s*$/.test(finalTranscript)) {
            transcript = transcript.charAt(0).toUpperCase() + transcript.slice(1);
        }

        if (results[i].isFinal) {
            finalTranscript += transcript;
            // Add space after punctuation if missing
            if (!/[.,!?]\s$/.test(finalTranscript)) {
                finalTranscript += ' ';
            }
        } else {
            interTranscript += transcript;
        }
    }

    return { finalTranscript, interTranscript };
}

function stopConverting() {
    if (recognition && isListening) {
        isListening = false;
        shouldRestart = false; // Prevent auto-restart
        recognition.stop();
        updateUI();
        updateStatus("Stopping...", "ready");
    }
}

function copyText() {
    const text = resultElement.innerText;
    if (!text) return;

    navigator.clipboard.writeText(text)
        .then(() => {
            // Show temporary feedback
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
            }, 2000);
        })
        .catch(err => {
            console.error("Failed to copy text: ", err);
            alert("Failed to copy text. Please try again.");
        });
}

function clearText() {
    resultElement.innerHTML = '';
}

function updateUI() {
    startBtn.style.display = isListening ? 'none' : 'flex';
    stopBtn.style.display = isListening ? 'flex' : 'none';
    
    // Add/remove active class for stop button to make it clickable
    if (isListening) {
        stopBtn.classList.add('active');
    } else {
        stopBtn.classList.remove('active');
    }
}

function updateStatus(text, state) {
    statusText.textContent = text;
    
    // Reset all state classes
    statusDot.classList.remove("listening", "error", "warning", "ready");
    
    // Add the appropriate class
    if (state) {
        statusDot.classList.add(state);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", init);