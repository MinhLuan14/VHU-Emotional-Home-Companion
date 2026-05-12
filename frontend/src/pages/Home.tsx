import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Heart,
    Camera,
    Send,
    Mic,
    MicOff,
    Phone,
    Bell,
    Users,
    Clock,
    Activity,
    X,
    Sparkles,
    Shield,
    Brain,
    ChevronRight,
} from 'lucide-react';

import icon from '../assets/3DAI.png';
import { API_AI_URL } from '../config';

const Home: React.FC = () => {
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'Chào bác. Hôm nay bác cảm thấy thế nào ạ? Con luôn ở đây để đồng hành cùng bác.',
        },
    ]);

    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isAISpeaking, setIsAISpeaking] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const recognitionRef = useRef<any>(null);

    const callAI = async (text: string) => {
        setIsTyping(true);

        try {
            const response = await fetch(`${API_AI_URL}/api/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_input: text,
                }),
            });

            const data = await response.json();

            setMessages((prev) => [
                ...prev,
                {
                    role: 'bot',
                    text: data.text,
                },
            ]);

            if (data.audio) {
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }

                let cleanBase64 = data.audio;

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

                audio.play();

                audio.onended = () => {
                    setIsAISpeaking(false);
                    (window as any).isAISpeakingGlobal = false;

                    setTimeout(() => {
                        if (isVoiceMode && recognitionRef.current) {
                            try {
                                recognitionRef.current.start();
                            } catch (e) { }
                        }
                    }, 500);
                };
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        setMessages((prev) => [
            ...prev,
            {
                role: 'user',
                text: inputValue,
            },
        ]);

        const currentText = inputValue;

        setInputValue('');

        callAI(currentText);
    };

    const startListening = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Trình duyệt không hỗ trợ giọng nói.');
            return;
        }

        const recognition = new SpeechRecognition();

        recognition.lang = 'vi-VN';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            if ((window as any).isAISpeakingGlobal) return;

            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const text = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    setTranscript('');
                    handleVoiceCommand(text);
                } else {
                    interimTranscript += text;
                    setTranscript(interimTranscript);
                }
            }
        };

        recognition.onend = () => {
            if (isVoiceMode && !(window as any).isAISpeakingGlobal) {
                try {
                    recognition.start();
                } catch (e) { }
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

    const toggleVoiceMode = () => {
        if (!isVoiceMode) {
            setIsVoiceMode(true);
            startListening();
        } else {
            setIsVoiceMode(false);
            stopListening();
        }
    };

    const handleVoiceCommand = (text: string) => {
        if (!text.trim()) return;

        setMessages((prev) => [
            ...prev,
            {
                role: 'user',
                text,
            },
        ]);

        callAI(text);
    };

    return (
        <div className="min-h-screen bg-[#ECECEC]">

            {/* =========================================================
                VOICE MODE
            ========================================================== */}
            {isVoiceMode && (
                <div className="fixed inset-0 z-[9999] bg-[#EEF4FF] flex flex-col items-center justify-center px-6">

                    <button
                        onClick={() => setIsVoiceMode(false)}
                        className="absolute top-8 right-8 bg-white shadow-sm border border-gray-200 rounded-full p-4"
                    >
                        <X size={28} className="text-slate-600" />
                    </button>

                    <div
                        className={`w-56 h-56 rounded-[3rem] overflow-hidden border-4 transition-all duration-300 ${isListening
                            ? 'border-blue-400 scale-105 shadow-[0_0_60px_rgba(59,130,246,0.35)]'
                            : 'border-white'
                            }`}
                    >
                        <img
                            src={icon}
                            alt="AI"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <h2 className="text-4xl font-black text-slate-700 mt-10">
                        AI đang lắng nghe
                    </h2>

                    <p className="text-xl text-slate-500 mt-4 text-center max-w-xl leading-relaxed">
                        {transcript || 'Bác hãy nói chuyện với con nhé'}
                    </p>

                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`mt-10 w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${isListening
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                            }`}
                    >
                        {isListening ? (
                            <MicOff size={38} className="text-white" />
                        ) : (
                            <Mic size={38} className="text-white" />
                        )}
                    </button>
                </div>
            )}

            {/* =========================================================
                PAGE CONTAINER
            ========================================================== */}
            <div className="max-w-[1700px] mx-auto px-4 md:px-6 xl:px-8 py-6 space-y-8">

                {/* =========================================================
                    HERO SECTION
                ========================================================== */}
                <section className="relative overflow-hidden rounded-[3rem] bg-[#4D4D4D]">

                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-400 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-violet-500 blur-3xl"></div>
                    </div>

                    <div className="relative grid xl:grid-cols-2 gap-0">

                        {/* LEFT */}
                        <div className="p-8 md:p-12 xl:p-16 flex flex-col justify-center">

                            <div className="flex flex-wrap gap-3 mb-8">

                                <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-3 rounded-full text-white font-bold text-sm flex items-center gap-2">
                                    <Brain size={18} />
                                    AI thấu cảm
                                </div>

                                <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-3 rounded-full text-white font-bold text-sm flex items-center gap-2">
                                    <Shield size={18} />
                                    Bảo mật dữ liệu
                                </div>
                            </div>

                            <h1 className="text-white text-5xl md:text-6xl xl:text-7xl leading-[1.1] font-black max-w-4xl">
                                Đồng hành cảm xúc
                                <span className="block text-[#F6C445]">
                                    cho người cao tuổi
                                </span>
                            </h1>

                            <p className="mt-8 text-lg md:text-xl leading-relaxed text-white/75 max-w-2xl">
                                Hệ thống AI hỗ trợ tinh thần, theo dõi trạng thái cảm xúc,
                                kết nối gia đình và chăm sóc sức khỏe tinh thần toàn diện.
                            </p>

                            <div className="flex flex-wrap gap-4 mt-10">

                                <Link
                                    to="/Vision"
                                    className="h-16 px-8 rounded-2xl bg-[#F6C445] hover:bg-[#eab932] transition-all text-slate-900 font-black text-lg flex items-center gap-3 shadow-lg"
                                >
                                    <Mic size={22} />
                                    Trò chuyện với AI
                                </Link>

                                <button className="h-16 px-8 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 transition-all text-white font-black text-lg flex items-center gap-3">
                                    Xem hoạt động
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            {/* STATS */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14">

                                {[
                                    {
                                        title: 'AI hoạt động',
                                        value: '24/7',
                                    },
                                    {
                                        title: 'Độ an toàn',
                                        value: '99%',
                                    },
                                    {
                                        title: 'Phản hồi',
                                        value: '1.2s',
                                    },
                                    {
                                        title: 'Kết nối',
                                        value: 'Gia đình',
                                    },
                                ].map((item, index) => (
                                    <div
                                        key={index}
                                        className="bg-white/10 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
                                    >
                                        <p className="text-white/60 text-sm uppercase tracking-wider font-bold">
                                            {item.title}
                                        </p>

                                        <h3 className="text-white text-2xl font-black mt-2">
                                            {item.value}
                                        </h3>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT */}
                        <div className="relative min-h-[450px] xl:min-h-[800px]">

                            <img
                                src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1600&auto=format&fit=crop"
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover"
                            />

                            <div className="absolute inset-0 bg-gradient-to-r from-[#4D4D4D] via-[#4D4D4D]/30 to-transparent xl:bg-gradient-to-l"></div>

                            {/* FLOATING CARD */}
                            <div className="absolute bottom-10 left-10 right-10 bg-white/90 backdrop-blur-xl rounded-[2rem] p-6 border border-white/30 shadow-2xl">

                                <div className="flex items-center justify-between">

                                    <div>
                                        <p className="text-slate-400 uppercase tracking-widest text-xs font-black">
                                            Trạng thái hiện tại
                                        </p>

                                        <h3 className="text-3xl font-black text-slate-700 mt-2">
                                            Tinh thần tích cực
                                        </h3>
                                    </div>

                                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                                        <Heart
                                            className="text-emerald-500"
                                            fill="currentColor"
                                            size={30}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 h-3 rounded-full bg-slate-200 overflow-hidden">
                                    <div className="w-[75%] h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* =========================================================
                    MAIN GRID
                ========================================================== */}
                <div className="grid grid-cols-12 gap-8">

                    {/* =========================================================
                        LEFT SIDEBAR
                    ========================================================== */}
                    <div className="col-span-12 xl:col-span-3 space-y-8">

                        {/* CAMERA */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-200 overflow-hidden shadow-sm">

                            <div className="p-7 flex items-center justify-between">

                                <div className="flex items-center gap-3">
                                    <Camera className="text-blue-500" />

                                    <h3 className="text-2xl font-black text-slate-700">
                                        Camera AI
                                    </h3>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>

                                    <span className="text-sm font-bold text-emerald-600">
                                        Online
                                    </span>
                                </div>
                            </div>

                            <div className="relative">
                                <img
                                    src="https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&q=80&w=1000"
                                    alt=""
                                    className="w-full h-80 object-cover"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

                                <div className="absolute bottom-6 left-6 right-6">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5">
                                        <p className="text-slate-400 uppercase tracking-widest text-xs font-black">
                                            Hoạt động
                                        </p>

                                        <h4 className="text-2xl font-black text-slate-700 mt-2">
                                            Đang thư giãn
                                        </h4>

                                        <p className="text-slate-500 mt-2">
                                            Không phát hiện bất thường trong 2 giờ gần nhất.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* EMOTION */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-sm">

                            <div className="flex items-center gap-3 mb-10">
                                <Sparkles className="text-violet-500" />

                                <h3 className="text-2xl font-black text-slate-700">
                                    Cảm xúc hôm nay
                                </h3>
                            </div>

                            <div className="flex justify-center">

                                <div className="relative w-52 h-52">

                                    <svg className="w-52 h-52 -rotate-90">

                                        <circle
                                            cx="104"
                                            cy="104"
                                            r="82"
                                            stroke="#E5E7EB"
                                            strokeWidth="16"
                                            fill="transparent"
                                        />

                                        <circle
                                            cx="104"
                                            cy="104"
                                            r="82"
                                            stroke="url(#gradient)"
                                            strokeWidth="16"
                                            fill="transparent"
                                            strokeDasharray="515"
                                            strokeDashoffset="120"
                                            strokeLinecap="round"
                                        />

                                        <defs>
                                            <linearGradient id="gradient">
                                                <stop offset="0%" stopColor="#3B82F6" />
                                                <stop offset="100%" stopColor="#8B5CF6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>

                                    <div className="absolute inset-0 flex flex-col items-center justify-center">

                                        <h4 className="text-5xl font-black text-slate-700">
                                            75%
                                        </h4>

                                        <p className="text-slate-400 font-bold mt-2">
                                            Tích cực
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =========================================================
                        CHAT CENTER
                    ========================================================== */}
                    <div className="col-span-12 xl:col-span-6">

                        <div className="bg-white rounded-[3rem] border border-gray-200 shadow-sm overflow-hidden h-[950px] flex flex-col">

                            {/* HEADER */}
                            <div className="px-8 py-7 border-b border-gray-100 bg-[#FAFAFA]">

                                <div className="flex items-center justify-between">

                                    <div className="flex items-center gap-5">

                                        <div className="w-20 h-20 rounded-[2rem] overflow-hidden border border-gray-200 shadow-sm">
                                            <img
                                                src={icon}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        <div>

                                            <h3 className="text-3xl font-black text-slate-700">
                                                Trợ lý cảm xúc AI
                                            </h3>

                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>

                                                <p className="text-slate-400 font-semibold">
                                                    AI luôn sẵn sàng hỗ trợ
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={toggleVoiceMode}
                                        className="w-16 h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg"
                                    >
                                        <Mic className="text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* CHAT */}
                            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8 bg-[#F7F7F7] space-y-6">

                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.role === 'user'
                                            ? 'justify-end'
                                            : 'justify-start'
                                            }`}
                                    >

                                        <div
                                            className={`max-w-[90%] md:max-w-[80%] px-6 py-5 rounded-[2rem] text-lg leading-relaxed shadow-sm ${msg.role === 'user'
                                                ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-br-md'
                                                : 'bg-white text-slate-700 rounded-bl-md border border-gray-100'
                                                }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}

                                {isTyping && (
                                    <div className="bg-white w-fit px-6 py-5 rounded-2xl border border-gray-100 shadow-sm">

                                        <div className="flex gap-2">

                                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
                                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-100"></span>
                                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-200"></span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* INPUT */}
                            <div className="p-6 border-t border-gray-100 bg-white">

                                <div className="flex items-center gap-4">

                                    <input
                                        value={inputValue}
                                        onChange={(e) =>
                                            setInputValue(e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                            e.key === 'Enter' &&
                                            handleSendMessage()
                                        }
                                        placeholder="Bác muốn trò chuyện điều gì hôm nay?"
                                        className="flex-1 h-16 rounded-2xl bg-[#F5F5F5] border border-gray-200 px-6 text-lg outline-none focus:border-blue-400"
                                    />

                                    <button
                                        onClick={handleSendMessage}
                                        className="w-16 h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg"
                                    >
                                        <Send className="text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =========================================================
                        RIGHT SIDEBAR
                    ========================================================== */}
                    <div className="col-span-12 xl:col-span-3 space-y-8">

                        {/* FAMILY */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-sm">

                            <div className="flex items-center gap-3 mb-8">

                                <Users className="text-blue-500" />

                                <h3 className="text-2xl font-black text-slate-700">
                                    Gia đình
                                </h3>
                            </div>

                            <div className="space-y-5">

                                {[
                                    'Minh đã gửi video mới',
                                    'Tú gửi lời chúc buổi sáng',
                                    'Gia đình đang chờ cuộc gọi',
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className="bg-[#F7F7F7] rounded-2xl p-5 border border-gray-100"
                                    >
                                        <p className="text-slate-600 text-lg leading-relaxed">
                                            {item}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full h-16 mt-8 rounded-2xl bg-blue-600 hover:bg-blue-700 transition-all text-white text-lg font-black shadow-lg">
                                Xem kết nối
                            </button>
                        </div>

                        {/* ACTIVITIES */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-sm">

                            <div className="flex items-center gap-3 mb-8">

                                <Activity className="text-emerald-500" />

                                <h3 className="text-2xl font-black text-slate-700">
                                    Hoạt động tích cực
                                </h3>
                            </div>

                            <div className="space-y-4">

                                {[
                                    'Đi bộ nhẹ 10 phút',
                                    'Nghe nhạc thư giãn',
                                    'Gọi điện cho gia đình',
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex gap-4 rounded-2xl bg-[#F7F7F7] border border-gray-100 p-5"
                                    >
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 mt-2"></div>

                                        <p className="text-slate-600 text-lg">
                                            {item}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SOS */}
                        <div className="rounded-[2.5rem] bg-gradient-to-br from-red-500 to-rose-500 p-8 text-white shadow-xl">

                            <div className="flex items-center gap-3 mb-6">

                                <Bell />

                                <h3 className="text-2xl font-black">
                                    Hỗ trợ khẩn cấp
                                </h3>
                            </div>

                            <p className="text-white/85 text-lg leading-relaxed">
                                AI sẽ liên hệ gia đình hoặc nhân viên hỗ trợ khi phát hiện tình huống bất thường.
                            </p>

                            <button className="w-full h-16 rounded-2xl bg-white text-red-500 font-black text-lg mt-8 flex items-center justify-center gap-3 hover:bg-red-50 transition-all">
                                <Phone size={22} />
                                Gọi hỗ trợ
                            </button>
                        </div>
                    </div>
                </div>

                {/* =========================================================
                    BOTTOM SECTION
                ========================================================== */}
                <div className="grid xl:grid-cols-2 gap-8">

                    {/* CHART */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-sm">

                        <div className="flex items-center gap-3 mb-10">

                            <Activity className="text-orange-500" />

                            <h3 className="text-2xl font-black text-slate-700">
                                Xu hướng cảm xúc
                            </h3>
                        </div>

                        <div className="h-72 flex items-end gap-4">

                            {[45, 60, 55, 80, 72, 88, 95].map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 rounded-t-[2rem] bg-gradient-to-t from-blue-500 to-violet-500"
                                    style={{
                                        height: `${h}%`,
                                    }}
                                ></div>
                            ))}
                        </div>
                    </div>

                    {/* TIMELINE */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-sm">

                        <div className="flex items-center gap-3 mb-10">

                            <Clock className="text-blue-500" />

                            <h3 className="text-2xl font-black text-slate-700">
                                Hoạt động hôm nay
                            </h3>
                        </div>

                        <div className="space-y-5">

                            {[
                                {
                                    time: '08:00',
                                    text: 'Đi bộ buổi sáng',
                                },
                                {
                                    time: '10:30',
                                    text: 'Xem video từ gia đình',
                                },
                                {
                                    time: '12:00',
                                    text: 'Uống thuốc đúng giờ',
                                },
                                {
                                    time: '15:00',
                                    text: 'Trò chuyện với AI',
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex gap-5 rounded-2xl bg-[#F7F7F7] border border-gray-100 p-6"
                                >

                                    <div className="min-w-[80px] text-blue-600 text-lg font-black">
                                        {item.time}
                                    </div>

                                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-2"></div>

                                    <div className="text-slate-600 text-lg">
                                        {item.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;