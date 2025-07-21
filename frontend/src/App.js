import React, { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const handleSend = async (text) => {
    if (!text && !input) return;
    const userMessage = text || input;
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('query', userMessage);
      const response = await axios.post('http://127.0.0.1:8000/api/query', formData);
      const botMessage = response.data.answer || "Sorry, I couldn't get an answer.";
      setMessages(prev => [...prev, { sender: 'bot', text: botMessage }]);
      speak(botMessage);
    } catch (error) {
      console.error("Error querying RAG:", error);
      const errorMessage = "Sorry, something went wrong. Please check the backend.";
      setMessages(prev => [...prev, { sender: 'bot', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support audio recording.");
      return;
    }
    setIsRecording(true);
    audioChunks.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    mediaRecorder.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };
    mediaRecorder.current.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    mediaRecorder.current.stop();
    mediaRecorder.current.onstop = async () => {
      setIsLoading(true);
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');

      try {
        const response = await axios.post('http://127.0.0.1:8000/api/transcribe', formData);
        const transcribedText = response.data.transcription;
        if (transcribedText) {
          handleSend(transcribedText);
        } else {
           setIsLoading(false);
        }
      } catch (error) {
        console.error("Error transcribing audio:", error);
        setIsLoading(false);
      }
    };
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>MedicoAI 🩺</h1>
        <p>Your AI-powered medical assistant</p>
      </header>
      <div className="chat-container">
        <div className="chat-box">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          {isLoading && <div className="message bot">Thinking...</div>}
        </div>
        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your question or use the mic"
            disabled={isLoading}
          />
          <button onClick={() => handleSend()} disabled={isLoading}>Send</button>
          <button 
            onClick={isRecording ? stopRecording : startRecording} 
            className={`mic-button ${isRecording ? 'recording' : ''}`}
            disabled={isLoading}
          >
            🎤
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;