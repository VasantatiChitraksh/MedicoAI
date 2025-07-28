import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- SVG Icons for the futuristic look ---
const SendIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const MicIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const BotIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8V4H8V8H12ZM16 12V8H12V12H16ZM16 16V12H12V16H16ZM12 16H8V12H12V16ZM12 20V16H8V20H12ZM16 20V16H20V20H16ZM16 8H20V4H16V8ZM8 12H4V8H8V12ZM8 16V12H4V16H8Z" fill="rgba(0, 255, 255, 0.8)" />
        <path fillRule="evenodd" clipRule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" fill="rgba(0, 255, 255, 1)"/>
    </svg>
);

// --- Medical Monitor Heartbeat Canvas Background ---
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
            
            // Vertical grid lines
            for (let x = 0; x < width; x += 20) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            
            // Horizontal grid lines
            for (let y = 0; y < height; y += 20) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }

        function drawHeartbeat() {
            step += 2;
            
            // Add new point - medical heartbeat pattern
            const centerY = height / 2;
            let y = centerY;

            // Create realistic ECG heartbeat pattern
            const beatCycle = step % 200;
            
            if (beatCycle >= 50 && beatCycle <= 120) {
                const t = (beatCycle - 50) / 70;
                
                if (t < 0.1) {
                    // P wave (small bump)
                    y += Math.sin(t * 10 * Math.PI) * 15;
                } else if (t >= 0.3 && t <= 0.5) {
                    // QRS complex (main spike)
                    const qrsT = (t - 0.3) / 0.2;
                    if (qrsT < 0.3) {
                        y -= qrsT * 40; // Q dip
                    } else if (qrsT < 0.7) {
                        y += (qrsT - 0.3) * 200; // R spike
                    } else {
                        y -= (qrsT - 0.7) * 150; // S dip
                    }
                } else if (t >= 0.7 && t <= 0.9) {
                    // T wave
                    const tT = (t - 0.7) / 0.2;
                    y += Math.sin(tT * Math.PI) * 25;
                }
            }

            line.push({ x: width, y });

            // Draw the ECG line
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            for (let i = 0; i < line.length; i++) {
                line[i].x -= 4;
                if (i === 0) {
                    ctx.moveTo(line[i].x, line[i].y);
                } else {
                    ctx.lineTo(line[i].x, line[i].y);
                }
            }
            ctx.stroke();

            // Remove points that are off-screen
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
    // State management
    const [messages, setMessages] = useState([{
        sender: 'bot',
        text: "MedicoAI System Online. I am ready to assist you with medical inquiries. How may I help you today?"
    }]);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Refs
    const chatBoxRef = useRef(null);

    // Scroll to bottom of chat
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Send text message to backend
    const handleSend = async (text) => {
        const userMessage = text || input;
        if (!userMessage.trim()) return;

        setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setInput('');
        setIsLoading(true);

        try {
            // Simulate API call - replace with actual backend call
            setTimeout(() => {
                const botMessage = `Thank you for your query: "${userMessage}". This is a simulated response. Please connect to your actual backend API.`;
                setMessages(prev => [...prev, { sender: 'bot', text: botMessage }]);
                setIsLoading(false);
            }, 1500);
        } catch (error) {
            console.error("Error querying backend:", error);
            const errorMessage = "Connection Error: Please ensure the backend server is running and accessible.";
            setMessages(prev => [...prev, { sender: 'bot', text: errorMessage }]);
            setIsLoading(false);
        }
    };

    // Audio Recording Logic (simplified for demo)
    const startRecording = async () => {
        setIsRecording(true);
        // Add your actual recording logic here
    };

    const stopRecording = async () => {
        setIsRecording(false);
        // Add your actual recording stop logic here
    };

    return (
        <div className="font-mono text-white bg-black min-h-screen flex flex-col">
            <MedicalMonitorCanvas />

            {/* Header */}
            <header className="text-center py-6 border-b border-cyan-400/30">
                <h1 className="text-5xl font-bold tracking-widest text-white" 
                    style={{ 
                        textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff, 2px 2px 0px #00ffff, -2px -2px 0px #00ffff, 2px -2px 0px #00ffff, -2px 2px 0px #00ffff',
                        WebkitTextStroke: '2px #00ffff'
                    }}>
                    MEDICO-AI
                </h1>
                <p className="text-green-400 text-sm tracking-wider mt-2">
                    SYSTEM STATUS: <span className="text-green-300 animate-pulse">● ONLINE</span>
                </p>
            </header>

            {/* Chat Container */}
            <main className="flex-1 flex justify-center items-center p-6">
                <div className="w-full max-w-4xl h-96 flex flex-col"
                     style={{
                         background: 'rgba(0, 0, 0, 0.8)',
                         backdropFilter: 'blur(10px)',
                         border: '2px solid #00ffff',
                         borderRadius: '15px',
                         boxShadow: '0 0 30px rgba(0, 255, 255, 0.5), inset 0 0 30px rgba(0, 255, 255, 0.1)'
                     }}>
                    
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={chatBoxRef}>
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'bot' && <div className="mt-1"><BotIcon /></div>}
                                <div className={`p-4 rounded-lg max-w-lg ${
                                    msg.sender === 'user' 
                                    ? 'bg-blue-900/70 border border-blue-400/50 rounded-br-none text-white' 
                                    : 'bg-cyan-900/70 border border-cyan-400/50 rounded-bl-none text-white'
                                }`} style={{
                                    backdropFilter: 'blur(5px)',
                                    boxShadow: '0 4px 15px rgba(0, 255, 255, 0.2)'
                                }}>
                                    <p className="whitespace-pre-wrap text-white">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-4 justify-start">
                                <div><BotIcon /></div>
                                <div className="p-4 rounded-lg bg-cyan-900/70 border border-cyan-400/50 rounded-bl-none animate-pulse text-white"
                                     style={{
                                         backdropFilter: 'blur(5px)',
                                         boxShadow: '0 4px 15px rgba(0, 255, 255, 0.2)'
                                     }}>
                                    Processing medical query...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 border-t border-cyan-400/30">
                        <div className="flex items-center gap-4">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Enter your medical query..."
                                disabled={isLoading || isRecording}
                                className="flex-1 p-4 bg-black/50 border-2 border-cyan-400/70 rounded-lg focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(0,255,255,0.7)] transition-all duration-300 placeholder-cyan-500 text-white"
                                style={{ backdropFilter: 'blur(5px)' }}
                            />
                            <button 
                                onClick={() => handleSend()} 
                                disabled={isLoading || isRecording || !input}
                                className="p-4 text-cyan-300 border-2 border-cyan-400 rounded-full hover:bg-cyan-400 hover:text-black disabled:text-gray-600 disabled:border-gray-600 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.7)]"
                                title="Send Message"
                            >
                                <SendIcon />
                            </button>
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isLoading}
                                className={`p-4 text-cyan-300 border-2 border-cyan-400 rounded-full hover:bg-cyan-400 hover:text-black disabled:text-gray-600 disabled:border-gray-600 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.7)] ${
                                    isRecording ? 'bg-red-500 border-red-400 text-white animate-pulse' : ''
                                }`}
                                title={isRecording ? "Stop Recording" : "Start Recording"}
                            >
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