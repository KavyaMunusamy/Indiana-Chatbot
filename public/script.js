async function sendMessage() {
  const inputField = document.getElementById('input');
  const message = inputField.value.trim();
  
  if (!message) return;

  // Display user message
  const chatbox = document.getElementById('chatbox');
  const userMessage = document.createElement('div');
  userMessage.className = 'user-message';
  userMessage.textContent = 'You: ' + message;
  chatbox.appendChild(userMessage);

  // Clear input
  inputField.value = '';

  // Send message to server
  try {
    const lang = document.getElementById('langSelect').value;
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, lang })
    });
    const data = await res.json();

    // Display bot reply
    const botMessage = document.createElement('div');
    botMessage.className = 'bot-message';
    botMessage.textContent = 'Bot: ' + data.reply;
    chatbox.appendChild(botMessage);

    // Speak the bot's reply
    speakResponse(data.reply, lang);

    // Scroll to bottom
    chatbox.scrollTop = chatbox.scrollHeight;

  } catch (error) {
    console.error('Error:', error);
  }
}

function speakResponse(text, lang) {
  if ('speechSynthesis' in window) {
    // Log available voices for debugging
    console.log('Available speech synthesis voices:', window.speechSynthesis.getVoices());

    // Cancel any previous speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  } else {
    alert('Sorry, your browser does not support text-to-speech.');
  }
}

function startVoiceInput() {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Sorry, your browser does not support speech recognition.');
    return;
  }
  const recognition = new webkitSpeechRecognition();
  // Get selected language
  const lang = document.getElementById('langSelect').value;
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    document.getElementById('input').value = transcript;
  };

  recognition.onerror = function(event) {
    alert('Voice recognition error: ' + event.error);
  };

  recognition.start();
}

document.getElementById('imageForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const formData = new FormData(this);

  const response = await fetch('/report/image', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  document.getElementById('imageUploadResult').innerText = result.message;
});
