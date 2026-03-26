import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import {
    Camera, ShieldAlert, Activity, Settings, CheckCircle2,
    RefreshCw, AlertTriangle, Home as HomeIcon, User,
    Mic, MicOff, Volume2, Brain, Upload, UserPlus, Loader2, X, Save
} from 'lucide-react';
import { API_AI_URL } from '../config';

interface AIData {
    status: string;
    is_warning: boolean;
    emotion: string;
    back_angle: number;
    velocity: number;
}

// Định nghĩa interface cho người thân
interface Relative {
    id: string;
    name: string;
}

const Vision: React.FC = () => {
    // --- CÁC STATE CŨ CỦA BẠN ---
    const [isAIOn, setIsAIOn] = useState(true);
    const [cameraSource, setCameraSource] = useState<'device' | 'home'>('device');
    const [isSedentaryWarning, setIsSedentaryWarning] = useState(false);
    const webcamRef = useRef<Webcam>(null);
    const [isListening, setIsListening] = useState(false);
    const [aiResponseText, setAiResponseText] = useState("");
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [aiData, setAiData] = useState<AIData>({
        status: "Đang kết nối...",
        is_warning: false,
        emotion: "Ổn định",
        back_angle: 0,
        velocity: 0
    });

    // --- BỔ SUNG STATE CHO OPENVOICE ---
    const [relatives, setRelatives] = useState<Relative[]>([
        { id: 'grandson', name: 'Cháu Minh' },
        { id: 'daughter', name: 'Con Lan' },
        { id: 'son', name: 'Con Trai' }
    ]);
    const [selectedRelative, setSelectedRelative] = useState<Relative>(relatives[0]);
    const [showAddVoice, setShowAddVoice] = useState(false);
    const [newName, setNewName] = useState("");
    const [isRecordingSample, setIsRecordingSample] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    // --- LOGIC FETCH STATUS (GIỮ NGUYÊN) ---
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/ai/status');
                if (response.ok) {
                    const data = await response.json();
                    setAiData(data);
                }
            } catch (error) {
                console.error("Không thể lấy dữ liệu AI:", error);
            }
        };
        const interval = setInterval(fetchStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    // --- LOGIC VOICE CHAT (GIỮ NGUYÊN) ---
    const handleVoiceChat = async (transcript: string) => {
        setIsListening(false);
        try {
            const response = await fetch(`${API_AI_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_input: transcript,
                    voice_id: selectedRelative.id
                }),
            });
            const data = await response.json();
            setAiResponseText(data.text);
            if (data.audio && audioRef.current) {
                audioRef.current.src = data.audio;
                audioRef.current.play();
            }
        } catch (error) {
            console.error("Lỗi giao tiếp:", error);
        }
    };

    const startListening = () => {
        setIsListening(true);
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'vi-VN';
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                handleVoiceChat(transcript);
            };
            recognition.start();
        }
    };

    // --- BỔ SUNG LOGIC GHI ÂM MẪU CHO OPENVOICE ---
    const startSampling = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => setAudioBlob(new Blob(chunks, { type: 'audio/wav' }));
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecordingSample(true);
        } catch (err) { alert("Cần quyền truy cập mic!"); }
    };

    const stopSampling = () => {
        mediaRecorderRef.current?.stop();
        setIsRecordingSample(false);
    };

    const handleAddVoice = async () => {
        if (!newName || !audioBlob) return;
        setIsProcessing(true);
        const formData = new FormData();
        formData.append("name", newName);
        formData.append("sample_audio", audioBlob, "sample.wav");

        try {
            const response = await fetch(`${API_AI_URL}/api/ai/extract-voice`, {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                const data = await response.json();
                setRelatives(prev => [...prev, { id: data.voice_id, name: newName }]);
                setShowAddVoice(false);
                setNewName("");
                setAudioBlob(null);
            }
        } catch (error) {
            console.error("Lỗi trích xuất giọng:", error);
        } finally { setIsProcessing(false); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-10">
            <audio ref={audioRef} hidden />

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-700 tracking-tight uppercase">
                        AI <span className="text-blue-600">Thị Giác & Giao Tiếp</span>
                    </h2>
                    <p className="text-slate-500 font-medium text-sm">Giám sát an toàn và trò chuyện cùng người thân.</p>
                </div>

                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
                    <button onClick={() => setIsAIOn(true)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${isAIOn ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>PHÂN TÍCH AI: BẬT</button>
                    <button onClick={() => setIsAIOn(false)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${!isAIOn ? 'bg-slate-600 text-white shadow-lg' : 'text-slate-400'}`}>CHẾ ĐỘ GỐC</button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* LEFT: VIDEO FEED */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="relative bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white aspect-video group">

                        {cameraSource === 'device' ? (
                            <img
                                src={`${API_AI_URL}/api/ai/video_feed`}
                                className="w-full h-full object-cover"
                                alt="AI Camera"
                            />
                        ) : (
                            <img src="https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover opacity-80" alt="Home Monitor" />
                        )}

                        {/* TÍCH HỢP MỚI: VOICE OVERLAY (Hiển thị lời nói AI trên màn hình camera) */}
                        {aiResponseText && (
                            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[80%] z-30">
                                <div className="bg-black/60 backdrop-blur-md text-white p-4 rounded-2xl border border-white/20 animate-in slide-in-from-bottom-4">
                                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1">{selectedRelative.name} đang nói:</p>
                                    <p className="text-sm font-medium italic">"{aiResponseText}"</p>
                                </div>
                            </div>
                        )}

                        {/* TÍCH HỢP MỚI: NÚT MIC GIAO TIẾP */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
                            <button
                                onClick={startListening}
                                className={`p-5 rounded-full shadow-2xl transition-all ${isListening ? 'bg-rose-500 animate-pulse scale-110' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {isListening ? <MicOff className="text-white" /> : <Mic className="text-white" />}
                            </button>
                        </div>

                        {/* Camera Source Selector */}
                        <div className="absolute top-20 left-6 z-20 flex gap-3 bg-black/30 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-lg">

                            {/* CAMERA THIẾT BỊ (AI Backend) */}
                            <button
                                onClick={() => setCameraSource('device')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all duration-300 border
                                         ${cameraSource === 'device'
                                        ? 'bg-blue-600 text-white border-blue-400 shadow-md scale-105'
                                        : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                                    }`}
                            >
                                <Camera size={14} />
                                CAMERA AI
                            </button>

                            {/* CAMERA PHÒNG KHÁCH (DEMO / CAMERA KHÁC) */}
                            <button
                                onClick={() => setCameraSource('home')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all duration-300 border
                                        ${cameraSource === 'home'
                                        ? 'bg-blue-600 text-white border-blue-400 shadow-md scale-105'
                                        : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                                    }`}
                            >
                                <HomeIcon size={14} />
                                PHÒNG KHÁCH 01
                            </button>

                        </div>
                    </div>

                    {/* TÍCH HỢP MỚI: QUẢN LÝ GIỌNG NÓI NGƯỜI THÂN */}
                    <div className="bg-white/80 backdrop-blur-md p-5 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                                    <Volume2 size={22} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hệ thống mô phỏng</p>
                                    <p className="text-sm font-black text-slate-700">Giọng nói: <span className="text-blue-600">{selectedRelative.name}</span></p>
                                </div>
                            </div>

                            {/* NÚT THÊM GIỌNG MỚI */}
                            <button
                                onClick={() => setShowAddVoice(true)} // Giả định bạn dùng state showAddVoice để mở modal
                                className="group flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all active:scale-95 shadow-lg shadow-slate-200"
                            >
                                <UserPlus size={14} className="group-hover:rotate-12 transition-transform" />
                                THÊM GIỌNG NGƯỜI THÂN
                            </button>
                        </div>

                        {/* DANH SÁCH GIỌNG NÓI ĐÃ CÓ */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                            {relatives.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => setSelectedRelative(r)}
                                    className={`
                    relative px-5 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2
                    ${selectedRelative.id === r.id
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200 translate-y-[-2px]'
                                            : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}
                `}
                                >
                                    {selectedRelative.id === r.id && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border-2 border-white"></span>
                                        </span>
                                    )}
                                    <User size={12} className={selectedRelative.id === r.id ? 'text-blue-200' : 'text-slate-300'} />
                                    {r.name.toUpperCase()}
                                </button>
                            ))}

                            {/* HIỆU ỨNG TRẠNG THÁI KHI ĐANG XỬ LÝ AI */}
                            {isListening && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-2xl border border-rose-100 animate-pulse">
                                    <Loader2 size={12} className="text-rose-500 animate-spin" />
                                    <span className="text-[9px] font-black text-rose-500 uppercase">Hệ thống đang nghe...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: AI BEHAVIOR & EMOTION ANALYSIS */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* Main AI Status Card */}
                    <div className={`relative overflow-hidden rounded-[2.5rem] p-1 shadow-2xl transition-all duration-700 ${aiData.is_warning ? 'bg-gradient-to-br from-red-500 via-rose-500 to-orange-500' : 'bg-gradient-to-br from-slate-100 to-slate-200'
                        }`}>
                        <div className="bg-white/90 backdrop-blur-xl rounded-[2.4rem] p-8 h-full">
                            {/* Header: AI Scanner Effect */}
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className={`relative p-3 rounded-2xl ${aiData.is_warning ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'}`}>
                                        <Activity size={24} className={aiData.is_warning ? 'animate-pulse' : ''} />
                                        {!aiData.is_warning && <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                        </span>}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">AI Guardian System</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">VHU - Emotional Companion</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* Visual Status Node */}
                                <div className="flex flex-col items-center justify-center py-6 border-y border-slate-100 relative">
                                    {/* Hiệu ứng radar quét khi bình thường */}
                                    {!aiData.is_warning && <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                        <div className="w-32 h-32 border border-emerald-500 rounded-full animate-[ping_3s_linear_infinite]"></div>
                                    </div>}

                                    <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl transition-all duration-500 z-10 ${aiData.is_warning
                                        ? 'bg-red-500 text-white scale-110 shadow-red-200 animate-bounce'
                                        : 'bg-white text-emerald-500 border-4 border-emerald-50'
                                        }`}>
                                        {aiData.is_warning ? '🚨' : (aiData.emotion === 'Vui vẻ' ? '😊' : '🤖')}
                                    </div>

                                    <div className="text-center mt-6 space-y-2">
                                        <h4 className={`text-3xl font-black tracking-tighter ${aiData.is_warning ? 'text-red-600' : 'text-slate-800'}`}>
                                            {aiData.status.replace(/🚨|⚠️|🆘|✅|🧘/g, '')}
                                        </h4>
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100">
                                            <div className={`w-2 h-2 rounded-full ${aiData.is_warning ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                            <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                                                Cảm xúc: <span className="text-indigo-600">{aiData.emotion}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics Grid: Glassmorphism Style */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group bg-gradient-to-b from-slate-50 to-white p-5 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Góc lưng</p>
                                            <div className="p-1.5 bg-white rounded-lg shadow-sm text-indigo-500"><Activity size={12} /></div>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-slate-800 tracking-tighter">{aiData.back_angle || 0}°</span>
                                            <span className={`text-[10px] font-bold uppercase ${aiData.back_angle < 155 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                                {aiData.back_angle < 155 ? 'Khom' : 'Thẳng'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-1.5 mt-3 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${(aiData.back_angle / 180) * 100}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="group bg-gradient-to-b from-slate-50 to-white p-5 rounded-[2rem] border border-slate-100 hover:border-red-200 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Vận tốc</p>
                                            <div className="p-1.5 bg-white rounded-lg shadow-sm text-rose-500"><Activity size={12} /></div>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-2xl font-black tracking-tighter ${aiData.velocity > 30 ? 'text-red-500' : 'text-slate-800'}`}>
                                                {Math.abs(aiData.velocity || 0).toFixed(1)}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">px/frame</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-1.5 mt-3 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-300 ${aiData.velocity > 30 ? 'bg-red-500' : 'bg-rose-400'}`}
                                                style={{ width: `${Math.min((Math.abs(aiData.velocity) / 50) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Insight Section */}
                                <div className={`rounded-[2rem] p-6 border transition-all duration-500 ${aiData.is_warning
                                    ? 'bg-red-50 border-red-100 shadow-inner'
                                    : 'bg-indigo-50/50 border-indigo-100 shadow-sm'
                                    }`}>
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center shadow-md ${aiData.is_warning ? 'bg-red-500 text-white' : 'bg-white text-indigo-600'
                                            }`}>
                                            <Brain size={20} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-indigo-900/40 uppercase tracking-widest font-mono">AI Suggestion</p>
                                            <p className={`text-xs font-bold leading-relaxed ${aiData.is_warning ? 'text-red-900' : 'text-indigo-900'}`}>
                                                "{aiData.is_warning
                                                    ? "Phát hiện chuyển động rơi tự do bất thường! Đang kích hoạt giao thức cứu hộ và phát cảnh báo âm thanh."
                                                    : "Trạng thái ổn định. Cụ đang có tư thế ngồi khoa học và tâm trạng tích cực."}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Vision;