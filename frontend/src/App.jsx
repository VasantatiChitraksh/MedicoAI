import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

// --- SVG Icons (No changes here) ---
const SendIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const MicIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const BotIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M12 8V4H8V8H12ZM16 12V8H12V12H16ZM16 16V12H12V16H16ZM12 16H8V12H12V16ZM12 20V16H8V20H12ZM16 20V16H20V20H16ZM16 8H20V4H16V8ZM8 12H4V8H8V12ZM8 16V12H4V16H8Z" fill="rgba(0, 255, 255, 0.8)" />
        <path fillRule="evenodd" clipRule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" fill="rgba(0, 255, 255, 1)"/>
    </svg>
);

// --- Medical Monitor Heartbeat Canvas Background (No changes here) ---
const MedicalMonitorCanvas = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width, height;
        let step = 0;
        const line = [];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        function drawGrid() {
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.1)';
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += 20) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += 20) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }

        function drawHeartbeat() {
            step += 2;
            const centerY = height / 2;
            let y = centerY;
            const beatCycle = step % 200;

            if (beatCycle >= 50 && beatCycle <= 120) {
                const t = (beatCycle - 50) / 70;
                if (t < 0.1) {
                    y += Math.sin(t * 10 * Math.PI) * 15;
                } else if (t >= 0.3 && t <= 0.5) {
                    const qrsT = (t - 0.3) / 0.2;
                    if (qrsT < 0.3) {
                        y -= qrsT * 40;
                    } else if (qrsT < 0.7) {
                        y += (qrsT - 0.3) * 200;
                    } else {
                        y -= (qrsT - 0.7) * 150;
                    }
                } else if (t >= 0.7 && t <= 0.9) {
                    const tT = (t - 0.7) / 0.2;
                    y += Math.sin(tT * Math.PI) * 25;
                }
            }

            line.push({ x: width, y });

            ctx.strokeStyle = 'rgba(0, 255, 100, 0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath();

            for (let i = 0; i < line.length; i++) {
                line[i].x -= 4;
                if (i === 0) ctx.moveTo(line[i].x, line[i].y);
                else ctx.lineTo(line[i].x, line[i].y);
            }
            ctx.stroke();

            while (line.length > 0 && line[0].x < -10) {
                line.shift();
            }
        }

        function draw() {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, width, height);
            drawGrid();
            drawHeartbeat();
            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', resize);
        resize();
        draw();

        return () => window.removeEventListener('resize', resize);
    }, []);

    return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }} />;
};


// --- Main App Component ---
function App() {
    const [messages, setMessages] = useState([{
        sender: 'bot',
        text: "MedicoAI System Online. I am ready to assist you with medical inquiries. How may I help you today?"
    }]);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const chatBoxRef = useRef(null);
    
    // Refs for recorder logic
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async (text) => {
        const userMessage = text || input;
        if (!userMessage.trim()) return;

        setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setInput('');
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('query', userMessage);
            const response = await axios.post('http://127.0.0.1:8000/api/query', formData);
            const botMessage = response.data.answer || "Sorry, I couldn't get a valid answer.";
            setMessages(prev => [...prev, { sender: 'bot', text: botMessage }]);
            speak(botMessage);
        } catch (error) {
            console.error("Error querying backend:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: "Connection Error: Please ensure the backend server is running and accessible." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranscription = async (audioBlob) => {
        try {
            const formData = new FormData();
            formData.append('audio_file', audioBlob, 'recording.webm'); // Use .webm or appropriate format
            const response = await axios.post('http://127.0.0.1:8000/api/transcribe', formData);
            const transcribedText = response.data.transcription;
            
            if (transcribedText) {
                handleSend(transcribedText);
            } else {
                setMessages(prev => [...prev, { sender: 'bot', text: "Could not understand audio. Please try again." }]);
                setIsLoading(false); // Stop loading if transcription is empty
            }
        } catch (error) {
            console.error("Error transcribing audio:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, there was an error processing your audio." }]);
            setIsLoading(false);
        }
    };

    const startRecording = async () => {
        setIsLoading(true); // Indicate that we are setting up the recorder
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream; // Store stream to stop it later
            
            // Create a new MediaRecorder instance
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            
            // Clear previous audio chunks
            audioChunksRef.current = [];

            // Event handler for when data is available
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            // Event handler for when recording stops
            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                handleTranscription(audioBlob);
                
                // Stop the media stream tracks to turn off the mic indicator
                streamRef.current.getTracks().forEach(track => track.stop());
            };

            // Start recording
            recorder.start();
            setIsRecording(true);
            setIsLoading(false);

        } catch (error) {
            console.error("Error starting recording:", error);
            alert("Could not start recording. Please ensure you have given microphone permissions and are on a secure (HTTPS) connection.");
            setIsLoading(false);
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsLoading(true); // Show loading while we transcribe
        }
    };

    const speak = (text) => {
        try {
            window.speechSynthesis.cancel(); // Cancel any previous speech
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Speech synthesis failed.", error);
        }
    };

    return (
        <div className="font-mono text-white bg-black min-h-screen flex flex-col">
            <MedicalMonitorCanvas />

            <header className="text-center py-8 border-b border-cyan-400/30 bg-black/60 backdrop-blur-sm relative z-10">
                <h1 className="text-6xl font-bold tracking-widest mb-4"
                    style={{
                        textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff',
                        WebkitTextStroke: '2px #00ffff'
                    }}>
                    MEDICO-AI
                </h1>
                <p className="text-green-400 text-lg tracking-wider font-bold" style={{ color: 'green' }}>
                    SYSTEM STATUS: <span className="text-green-300 animate-pulse text-xl" style={{ color: 'green' }}>● ONLINE</span>
                </p>
            </header>

            <main className="flex-1 flex justify-center p-6 relative z-10">
                <div className="w-full max-w-6xl h-[70vh] flex flex-col border-4 border-cyan-400 rounded-lg bg-black/90 shadow-xl backdrop-blur-lg">
                    <div className="flex-1 overflow-y-auto p-8 space-y-6" ref={chatBoxRef}>
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'bot' && <div className="mt-1"><BotIcon /></div>}
                                <div className={`p-6 rounded-lg max-w-2xl ${
                                    msg.sender === 'user'
                                        ? 'bg-blue-800/80 border-2 border-blue-400/70 rounded-br-none'
                                        : 'bg-cyan-800/80 border-2 border-cyan-400/70 rounded-bl-none'
                                }`}>
                                    <p className="text-white text-lg leading-relaxed break-words" style={{ color: 'white' }}>{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4 justify-start items-center">
                                <BotIcon />
                                <div className="p-6 bg-cyan-900/70 border border-cyan-400/50 text-white rounded-lg animate-pulse">
                                    {isRecording ? 'Recording...' : 'Processing medical query...'}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-cyan-400/30">
                        <div className="flex items-center gap-4">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                                placeholder={isRecording ? "Recording... Click mic to stop." : "Enter your medical query..."}
                                disabled={isLoading || isRecording}
                                className="flex-1 p-4 bg-black/50 border-2 border-cyan-400/70 rounded-lg 
                                           text-white placeholder-white focus:outline-none focus:border-cyan-300 
                                           focus:shadow-[0_0_15px_rgba(0,255,255,0.7)] transition-all duration-300"
                            />
                            <button onClick={() => handleSend()} disabled={isLoading || isRecording || !input}
                                    className="p-4 text-cyan-300 border-2 border-cyan-400 rounded-full hover:bg-cyan-400 hover:text-black 
                                               disabled:text-gray-600 disabled:border-gray-600 transition-all duration-300">
                                <SendIcon />
                            </button>
                            <button onClick={isRecording ? stopRecording : startRecording} disabled={isLoading && !isRecording}
                                    className={`p-4 border-2 rounded-full transition-all duration-300
                                        ${isRecording 
                                            ? 'bg-red-500 border-red-400 text-white animate-pulse' 
                                            : 'text-cyan-300 border-cyan-400 hover:bg-cyan-400 hover:text-black'
                                        } disabled:text-gray-600 disabled:border-gray-600`}>
                                <MicIcon />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;