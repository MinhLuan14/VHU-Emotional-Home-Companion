import React, { useState, useEffect, useRef } from 'react';
import {
    Camera, PieChart, Video, Music, Heart, Users,
    Trophy, MessageCircle, TrendingUp, Clock, Send, Award, Bot, MicOff, X, Mic
} from 'lucide-react';
import icon from '../assets/3DAI.png';
import { API_AI_URL } from '../config';
const Home: React.FC = () => {
    const [messages, setMessages] = useState([
        { role: 'bot', text: "Chào bác! Con đã theo dõi hoạt động của bác hôm nay. Mọi thứ đều rất tuyệt! Cháu Minh có gửi một video mới, bác có muốn xem không ạ?" },
    ]);
    // --- STATES ---
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false); // Chỉ giữ lại 1 dòng này
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [isAISpeaking, setIsAISpeaking] = useState(false);

    // --- REFS ---
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const recognitionRef = useRef<any>(null);
    const callAI = async (text: string) => {
        setIsTyping(true);
        try {                           //http://localhost:8000/api/ai/chat
            const response = await fetch(`${API_AI_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_input: text }),
            });
            const data = await response.json();

            setMessages(prev => [...prev, { role: 'bot', text: data.text }]);

            if (data.audio) {
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }

                // Kiểm tra và làm sạch chuỗi trước khi gán
                let cleanBase64 = data.audio;
                // Nếu lỡ Backend gửi kèm tiền tố rồi thì mình bỏ đi để tránh trùng
                if (cleanBase64.includes('base64,')) {
                    cleanBase64 = cleanBase64.split('base64,')[1];
                }

                const audioSrc = data.audio.startsWith('http')
                    ? data.audio
                    : `data:audio/mpeg;base64,${cleanBase64}`;

                const audio = new Audio(audioSrc);
                audioRef.current = audio;

                setIsAISpeaking(true);
                (window as any).isAISpeakingGlobal = true;

                audio.play().catch(e => {
                    console.error("Lỗi phát âm thanh thực tế:", e);
                    // Nếu vẫn lỗi, thử log 10 ký tự đầu của src để kiểm tra
                    console.log("Đoạn đầu Audio Src:", audioSrc.substring(0, 50));
                });
                audio.onended = () => {
                    setIsAISpeaking(false);
                    (window as any).isAISpeakingGlobal = false;
                    setTranscript("");

                    // 3. Chỉ bật lại Mic sau khi Robot nói xong 500ms để tránh echo dư thừa
                    setTimeout(() => {
                        if (isVoiceMode && recognitionRef.current) {
                            try {
                                recognitionRef.current.start();
                            } catch (e) { /* Đã chạy rồi thì thôi */ }
                        }
                    }, 500);
                };
            }
        } catch (error) {
            console.error("Lỗi:", error);
            setIsAISpeaking(false);
            (window as any).isAISpeakingGlobal = false;
        } finally {
            setIsTyping(false);
        }
    };
    const handleSendMessage = () => {
        if (!inputValue.trim()) return;
        setMessages(prev => [...prev, { role: 'user', text: inputValue }]);
        const currentText = inputValue; // Giữ lại text để gửi
        setInputValue('');
        callAI(currentText);
    };

    const toggleVoiceMode = () => {
        if (!isVoiceMode) {
            setIsVoiceMode(true);
            startListening();
        } else {
            setIsVoiceMode(false);
            stopListening();
        }
    };

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Trình duyệt của bác không hỗ trợ nhận diện giọng nói.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.continuous = true;
        recognition.interimResults = true;

        // LƯU VÀO REF ĐỂ QUẢN LÝ
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true); // Cập nhật để giao diện biết đang nghe
        };

        recognition.onresult = (event: any) => {
            if ((window as any).isAISpeakingGlobal) return;

            let interimTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    setTranscript(""); // Xóa chữ tạm khi đã có câu chốt
                    handleVoiceCommand(text);
                } else {
                    interimTranscript += text;
                    setTranscript(interimTranscript);
                }
            }
        };

        recognition.onend = () => {
            // Nếu vẫn trong chế độ Voice và AI không nói thì tự bật lại
            if (isVoiceMode && !(window as any).isAISpeakingGlobal) {
                try { recognition.start(); } catch (e) { }
            } else {
                setIsListening(false);
            }
        };

        recognition.start();
    };
    const stopListening = () => {
        setIsListening(false);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    const handleVoiceCommand = (text: string) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { role: 'user', text: text }]);
        callAI(text);
    };
    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-700 pb-10">
            {/* 1. VOICE OVERLAY MODE */}
            {isVoiceMode && (
                <div className="fixed inset-0 z-[9999] bg-blue-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white animate-in zoom-in duration-300">
                    <button
                        onClick={() => setIsVoiceMode(false)}
                        className="absolute top-10 right-10 p-4 bg-white/10 rounded-full hover:bg-white/20 transition-all"
                    >
                        <X size={32} />
                    </button>

                    <div className="relative mb-8">
                        <div className={`w-64 h-64 rounded-[4rem] border-4 border-white/30 overflow-hidden shadow-2xl transition-all duration-500 ${isListening ? 'scale-110 shadow-blue-400/50' : 'scale-100'}`}>
                            <img src={icon} className="w-full h-full object-cover" alt="Ngavi" />
                        </div>
                        {isListening && (
                            <div className="absolute -inset-4 border-4 border-blue-400 rounded-[4.5rem] animate-ping opacity-50"></div>
                        )}
                    </div>

                    <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">
                        {isListening ? "Con đang nghe bác..." : "EmoCare AI sẵn sàng!"}
                    </h2>
                    <p className="text-blue-200 text-xl font-medium mb-12 h-8 italic text-center">
                        "{transcript || "Bác hãy nói gì đó với con đi..."}"
                    </p>

                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`p-8 rounded-full transition-all ${isListening ? 'bg-red-500 shadow-red-500/50' : 'bg-blue-500 shadow-blue-500/50'} shadow-2xl hover:scale-110`}
                    >
                        {isListening ? <MicOff size={40} /> : <Mic size={40} />}
                    </button>
                </div>
            )}

            {/* 2. HERO GREETING SECTION */}
            <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-8 border border-white shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-700 tracking-tight">
                            <span className="text-orange-500">Xin chào</span> <span className="text-blue-600">bác</span>
                        </h2>
                        <p className="text-slate-500 mt-2 font-medium text-lg">Trợ lý AI đang hoạt động và giám sát an toàn.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-2xl font-bold text-sm flex items-center gap-2">
                            <Heart size={18} fill="currentColor" /> Cảm xúc: Vui vẻ
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MAIN DASHBOARD GRID */}
            <div className="grid grid-cols-12 gap-6">

                {/* LEFT PANEL: MONITORING */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-gray-100">
                        <div className="p-5 flex justify-between items-center border-b border-gray-50">
                            <div className="flex items-center gap-2 text-slate-500 font-black uppercase text-xs tracking-widest">
                                <Camera size={16} className="text-orange-500" /> Giám sát hoạt động
                            </div>
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                        </div>
                        <div className="relative group">
                            <img src="https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&q=80&w=400" className="w-full h-56 object-cover" alt="Hoạt động" />
                            <div className="absolute inset-x-4 bottom-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white">
                                <p className="text-xs font-bold text-slate-400 uppercase">Trạng thái hiện tại</p>
                                <p className="text-slate-700 font-black text-sm">Đang ngồi (Tĩnh: 45ph)</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <h4 className="font-black text-slate-700 mb-4 flex items-center justify-between text-sm uppercase text-center w-full">
                                Chỉ số cảm xúc <PieChart size={16} className="text-blue-500" />
                            </h4>
                            <div className="flex items-center justify-center py-4 relative">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="314" strokeDashoffset="100" className="text-orange-400" />
                                </svg>
                                <div className="absolute text-center">
                                    <span className="block text-2xl font-black text-slate-700">75%</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Tích cực</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTRAL PANEL: CHATBOT */}
                <div className="col-span-12 lg:col-span-6 space-y-6">
                    <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-slate-100 flex flex-col h-[620px] relative z-20">
                        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center relative h-20 rounded-t-[2.8rem] z-10">
                            <div className="flex items-center gap-4 relative">
                                <div className="absolute -top-12 -left-10 w-36 h-36 z-[9999] drop-shadow-[0_25px_35px_rgba(0,0,0,0.4)] animate-bounce-slow">
                                    <div className="w-full h-full bg-white/10 backdrop-blur-lg rounded-[2.8rem] p-1.5 overflow-hidden border-2 border-white/40 shadow-[inset_0_0_15px_rgba(255,255,255,0.2)]">
                                        <img src={icon} alt="AI Guardian" className="w-full h-full object-cover rounded-[2.3rem]" />
                                    </div>
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-3 bg-blue-400/30 blur-xl rounded-full animate-pulse"></div>
                                </div>
                                <div className="w-24"></div>
                                <div className="z-10">
                                    <h3 className="font-black text-sm uppercase tracking-widest">Người bảo vệ hạnh phúc</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                        <p className="text-[10px] text-blue-100 font-bold uppercase">AI đang phân tích</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-grow p-6 overflow-y-auto space-y-4 bg-slate-50/50 scrollbar-hide">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`max-w-[80%] p-4 rounded-[2rem] font-medium text-sm shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-gray-100'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start animate-pulse">
                                    <div className="bg-white text-slate-400 p-4 rounded-[2rem] rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-white border-t border-gray-100 relative z-20 rounded-b-[3rem]">
                            <div className="relative flex items-center gap-2">
                                <div className="relative flex-grow">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Hỏi về hoạt động của bác..."
                                        className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-6 pr-14 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>

                                <button
                                    onClick={toggleVoiceMode}
                                    className="p-4 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all shadow-lg active:scale-95 group"
                                    title="Nói chuyện với Ngavi"
                                >
                                    <Mic size={22} className="group-hover:animate-pulse" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: LEADERBOARD */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-50">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Bảng xếp hạng</h3>
                            <Award size={20} className="text-orange-400" />
                        </div>
                        <div className="space-y-6">
                            {[
                                { name: 'Bác A', score: 1250, icon: '👴', color: 'bg-orange-100' },
                                { name: 'Minh', score: 980, icon: '👦', color: 'bg-blue-100' },
                                { name: 'Tú', score: 850, icon: '👧', color: 'bg-rose-100' }
                            ].map((user, i) => (
                                <div key={i} className="flex items-center justify-between group cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 ${user.color} rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform`}>{user.icon}</div>
                                        <span className="font-black text-slate-600 text-sm">{user.name}</span>
                                    </div>
                                    <span className="text-orange-500 font-black text-xs">{user.score} điểm</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10 space-y-4">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Mục tiêu tuần</span>
                            <h4 className="text-xl font-black leading-tight italic">"Chia sẻ 3 khoảnh khắc vui"</h4>
                            <button className="w-full bg-white text-indigo-600 py-3 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all uppercase">Tham gia ngay</button>
                        </div>
                        <Trophy className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
                    </div>
                </div>
            </div>

            {/* 4. BOTTOM SECTION: TRENDS & TIMELINE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp className="text-emerald-500" />
                        <h3 className="font-black text-slate-700 uppercase tracking-tighter italic">Xu hướng cảm xúc</h3>
                    </div>
                    <div className="h-40 w-full bg-slate-50 rounded-3xl flex items-end justify-between p-4 gap-2">
                        {[40, 70, 45, 90, 65, 80, 95].map((h, i) => (
                            <div key={i} className="flex-1 bg-orange-400 rounded-t-lg transition-all hover:bg-orange-500" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] font-black text-slate-400 uppercase px-2">
                        <span>Th2</span><span>Th3</span><span>Th4</span><span>Th5</span><span>Th6</span><span>Th7</span><span>CN</span>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                        <Clock className="text-blue-500" />
                        <h3 className="font-black text-slate-700 uppercase tracking-tighter italic">Dòng thời gian hoạt động</h3>
                    </div>
                    <div className="space-y-4">
                        {[
                            { time: '08:00 AM', act: 'Tập thể dục buổi sáng', status: 'Hoàn thành' },
                            { time: '10:30 AM', act: 'Xem tin tức gia đình', status: 'Gợi ý' },
                            { time: '12:00 PM', act: 'Ăn trưa & Uống thuốc', status: 'Sắp tới' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer">
                                <span className="text-[10px] font-black text-slate-400 w-16 tracking-tighter">{item.time}</span>
                                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                                <span className="text-sm font-bold text-slate-600 flex-grow">{item.act}</span>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md ${item.status === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;