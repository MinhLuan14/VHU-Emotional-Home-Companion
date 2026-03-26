import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import {
    Camera, ShieldAlert, Activity, Settings, CheckCircle2,
    RefreshCw, AlertTriangle, Home as HomeIcon, User,
    Mic, MicOff, Volume2, Brain, Upload, UserPlus, Loader2, X, Save
} from 'lucide-react';
import { API_AI_URL } from '../config';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { OrbitControls, Stage, Environment, Float } from '@react-three/drei';
import { EveRobot } from '../components/EveRobot';
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
            {/* THÔNG BÁO NỔI (ALERT OVERLAY) */}
            {aiData.is_warning && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce w-full max-w-md px-4">
                    <div className="bg-red-500 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border-2 border-white/30 backdrop-blur-lg">
                        <div className="bg-white/20 p-2 rounded-full">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black opacity-80 uppercase tracking-tighter">AI Alert System</span>
                            <span className="font-bold text-sm leading-tight">
                                {/* Luân lấy từ aiData.status hoặc aiData.message tùy theo Backend trả về */}
                                {aiData.status || "Phát hiện tư thế không tốt!"}
                            </span>
                        </div>
                    </div>
                </div>
            )}
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

                    {/* TÍCH HỢP MỚI: ROBOT 3D COMPANION */}
                    <div className="h-[80%] w-full bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl relative group">
                        <div className="absolute top-6 left-6 z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3D Companion Active</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${aiData.is_warning ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></div>
                                <span className="text-[11px] font-bold text-slate-600">EVE-01 ONLINE</span>
                            </div>
                        </div>

                        <Canvas shadows camera={{ position: [0, 1, 6], fov: 35 }}>
                            {/* Ánh sáng mạnh mẽ hơn để Robot nổi khối */}
                            <ambientLight intensity={1} />
                            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
                            <pointLight position={[-10, -10, -10]} intensity={1} />
                            <directionalLight position={[0, 5, 5]} intensity={1} />

                            <Suspense fallback={null}>
                                {/* Thêm Float để Robot bay bổng tự nhiên */}
                                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                                    <EveRobot aiData={aiData} />
                                </Float>
                                {/* Environment giúp vật liệu kim loại/nhựa của Robot sáng bóng hơn */}
                                <Environment preset="city" />
                            </Suspense>
                        </Canvas>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Vision;