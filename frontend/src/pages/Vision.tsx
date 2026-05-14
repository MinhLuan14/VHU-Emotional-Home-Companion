import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import Webcam from 'react-webcam';
import {
    Camera, ShieldAlert, Activity, Home as HomeIcon, User,
    Mic, MicOff, Volume2, UserPlus, Loader2, X, Info, Monitor, Clock
} from 'lucide-react';
import { API_AI_URL } from '../config';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { OrbitControls, Environment, Float, ContactShadows } from '@react-three/drei';
import { EveRobot } from '../components/EveRobot';
interface FaceData {
    x: number;
    y: number;
}

interface DetectedObject {
    label_en: string;
    label: string;
    bbox: number[];
    center: number[];
    conf: number;
    timestamp: number;
}

interface PostureData {
    state: "SITTING" | "STANDING" | "FALLING" | "UNKNOWN";
    back_angle: number;     // độ nghiêng lưng (degree)
    velocity: number;       // tốc độ thay đổi tư thế
    confidence: number;     // độ tin cậy AI (0 → 1)
}

interface PoseKeypoint {
    x: number;
    y: number;
    score?: number;
    name?: string;
}

interface PoseData {
    keypoints: PoseKeypoint[];
}

interface AIStatus {
    text: string;
    emotion?: string;
    sitting_seconds?: number;
}

export interface AIData {
    status: string | AIStatus;

    is_warning: boolean;

    emotion: string;

    detected_objects: DetectedObject[];

    sitting_seconds?: number;

    face?: FaceData;
    posture?: PostureData;
    pose?: PoseData;

    // optional future modules
    audio?: string;
    frame?: string;
    lip_sync?: number[];
}

interface Relative {
    id: string;
    name: string;
}

const Vision: React.FC = () => {
    // --- STATE LOGIC ---
    const [isAIOn, setIsAIOn] = useState(true);
    const [cameraSource, setCameraSource] = useState<'device' | 'home'>('device');
    const [isListening, setIsListening] = useState(false);
    const [aiResponseText, setAiResponseText] = useState("");
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [aiData, setAiData] = useState<AIData>({
        status: "Đang kết nối...",
        is_warning: false,
        emotion: "Ổn định",
        detected_objects: [], // Khởi tạo mảng rỗng để không bị lỗi
        sitting_seconds: 0,
    });

    const [relatives, setRelatives] = useState<Relative[]>([
        { id: 'grandson', name: 'Cháu Minh' },
        { id: 'daughter', name: 'Con Lan' },
        { id: 'son', name: 'Con Trai' }
    ]);
    const [selectedRelative, setSelectedRelative] = useState<Relative>(relatives[0]);
    const [showAddVoice, setShowAddVoice] = useState(false);
    const recognitionRef = useRef<any>(null);
    const [newName, setNewName] = useState("");
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [isHandsFree, setIsHandsFree] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [lastFrame, setLastFrame] = useState("");
    const socketRef = useRef<WebSocket | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (socketRef.current) return; // chống double connect

        const baseUrl = new URL(API_AI_URL);
        const protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${baseUrl.host}/ws/video`;

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log("✅ WS connected");
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.frame) {
                    setLastFrame(data.frame);
                }

                // 1. NORMALIZE STATUS & EMOTION
                // Ưu tiên lấy từ data.posture nếu data.status chỉ là chuỗi thông báo chung
                const statusText = data.posture?.status || (typeof data.status === "string" ? data.status : data.status?.text) || "UNKNOWN";
                const emotionText = data.emotion || data.status?.emotion || "Ổn định";
                const sittingSeconds = data.posture?.sitting_seconds || data.status?.sitting_seconds || 0;

                // 2. WARNING ENGINE (Nâng cấp độ nhạy)
                // ================= WARNING ENGINE =================

                const postureRisk = data.posture?.risk_level || "SAFE";

                const postureStatus =
                    data.posture?.status ||
                    data.status?.text ||
                    data.status ||
                    "UNKNOWN";

                const isWarning =
                    Boolean(data.is_warning || data.warning) ||

                    // FALL DETECT
                    data.posture?.is_falling === true ||

                    // BACKEND RISK
                    postureRisk === "WARNING" ||
                    postureRisk === "DANGER" ||

                    // TEXT FALLBACK
                    postureStatus.includes("NGỒI SAI") ||
                    postureStatus.includes("KHOM LƯNG") ||
                    postureStatus.includes("NGỒI QUÁ LÂU") ||
                    postureStatus.includes("TÉ NGÃ") ||
                    postureStatus.includes("FALL");

                // 3. FACE & POSE SAFE
                const face = {
                    x: data.face?.x ?? 0.5,
                    y: data.face?.y ?? 0.5,
                };
                const pose = data.pose || null;
                const detectedObjects = Array.isArray(data.detected_objects) ? data.detected_objects : [];

                // 4. STATE UPDATE
                setAiData((prev) => ({
                    ...prev,
                    status: postureStatus,
                    emotion: emotionText,
                    sitting_seconds: sittingSeconds,
                    face,
                    detected_objects: detectedObjects,
                    is_warning: isWarning,
                    posture: data.posture ? {
                        state: data.posture.state ?? "UNKNOWN",
                        back_angle: data.posture.back_angle ?? 0,
                        velocity: data.posture.velocity ?? 0,
                        confidence: data.posture.confidence ?? 0,
                        // Lưu thêm các flag quan trọng nếu cần dùng ở UI khác
                        is_falling: data.posture.is_falling,
                        risk_level: data.posture.risk_level
                    } : undefined,
                    pose,
                }));

            } catch (error) {
                console.error("❌ WS parse error:", error);
            }
        };

        socket.onerror = (err) => {
            console.error("❌ WS error:", err);
        };

        socket.onclose = () => {
            console.log("🔌 WS closed");
            socketRef.current = null;
        };

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, []);

    const handleVoiceChat = async (transcript: string) => {
        setIsProcessing(true);
        setIsListening(false); // Tắt mic ngay lập tức

        try {
            const response = await fetch(`${API_AI_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_input: transcript,
                    relative_id: selectedRelative.id
                }),
            });

            const data = await response.json();
            setAiResponseText(data.text);

            if (data.audio_url) {
                const audio = new Audio(`${API_AI_URL}${data.audio_url}?t=${Date.now()}`);
                audioRef.current = audio;

                // Khi AI bắt đầu nói
                audio.onplay = () => {
                    setIsProcessing(true); // Giữ trạng thái bận để useEffect không kích hoạt Mic
                };

                // KHI AI NÓI XONG -> Kích hoạt lại vòng lặp nghe
                audio.onended = () => {
                    setIsProcessing(false); // Giải phóng trạng thái, useEffect sẽ tự gọi startListening()
                };

                //await audio.play();
            } else {
                // Nếu không có audio, nghỉ 1 chút rồi nghe tiếp
                setTimeout(() => setIsProcessing(false), 1000);
            }

        } catch (error) {
            console.error("Chat error:", error);
            setIsProcessing(false); // Luôn giải phóng để không bị treo Mic
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;

        // Chỉ tự động bật lại nếu đang ở chế độ rảnh tay và AI đang RẢNH (không nghe, không xử lý, không nói)
        if (isHandsFree && !isListening && !isProcessing && !isSpeaking) {

            // Thêm khoảng nghỉ 1 giây để trình duyệt và phần cứng Mic có thời gian "thở"
            timer = setTimeout(() => {
                console.log("🔄 Tự động kích hoạt lại Mic sau 1s...");
                startListening();
            }, 1000);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isHandsFree, isListening, isProcessing, isSpeaking]);

    // 1. Định nghĩa Interface để TypeScript không báo lỗi "Cannot find name"
    interface IWindow extends Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;

    const startListening = () => {

        if (isProcessing || isListening) return;

        const Recognition = SpeechRecognition || webkitSpeechRecognition;

        if (!Recognition) {
            console.error("Browser không hỗ trợ speech recognition");
            return;
        }

        // Tạo 1 lần duy nhất
        if (!recognitionRef.current) {

            const recognition = new Recognition();

            recognition.lang = 'vi-VN';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                console.log("🎤 Listening...");
                setIsListening(true);
            };

            recognition.onresult = (event: any) => {

                const transcript =
                    event.results?.[0]?.[0]?.transcript || "";

                console.log("🗣️", transcript);

                if (transcript.trim().length > 1) {
                    handleVoiceChat(transcript);
                }
            };

            recognition.onerror = (event: any) => {

                console.error("Speech Error:", event.error);

                setIsListening(false);

                // Ignore lỗi nhỏ
                if (
                    event.error === "no-speech" ||
                    event.error === "aborted"
                ) {
                    return;
                }
            };

            recognition.onend = () => {
                console.log("🛑 Recognition ended");
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        try {
            recognitionRef.current.start();
        } catch (err) {
            console.log("Recognition already started");
        }
    };
    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await containerRef.current?.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error("Fullscreen error:", err);
        }
    };
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener(
            'fullscreenchange',
            handleFullscreenChange
        );

        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange
            );
        };
    }, []);
    return (
        <div className="relative space-y-8 animate-in fade-in duration-700 pb-10 max-w-[1600px] mx-auto">

            {/* 1. TOP ALERT OVERLAY (HIỂN THỊ KHI NGỒI SAI) */}
            {aiData.is_warning && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 animate-in zoom-in slide-in-from-top-10 duration-300">
                    <div className="relative overflow-hidden bg-white/20 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] shadow-[0_20px_50px_rgba(239,68,68,0.4)] flex items-center p-1">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-600/20 animate-pulse" />
                        <div className="relative flex items-center gap-4 w-full bg-white rounded-[2.3rem] p-3 shadow-inner">
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25" />
                                <div className="relative bg-gradient-to-br from-red-500 to-rose-600 p-3 rounded-full text-white shadow-lg">
                                    <ShieldAlert size={24} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none">Cảnh báo tư thế</span>
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">Sức khỏe</span>
                                </div>
                                <h4 className="text-base font-black text-slate-800 leading-tight uppercase tracking-tighter">
                                    {aiData.status ? String(aiData.status).replace(/[🚨⚠️🆘]/g, '').trim() : "ĐANG KIỂM TRA"}
                                </h4>
                            </div>
                            <button onClick={() => setAiData(prev => ({ ...prev, is_warning: false }))} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-300">
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">VHU Emotional Companion</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase leading-none">
                        AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Thị Giác</span>
                    </h2>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] shadow-inner">
                    <button onClick={() => setIsAIOn(true)} className={`px-6 py-2.5 rounded-[1.2rem] text-[10px] font-black transition-all ${isAIOn ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>PHÂN TÍCH AI</button>
                    <button onClick={() => setIsAIOn(false)} className={`px-6 py-2.5 rounded-[1.2rem] text-[10px] font-black transition-all ${!isAIOn ? 'bg-white text-slate-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>CHẾ ĐỘ GỐC</button>
                </div>
            </div>

            {/* 3. MAIN CONTENT GRID */}
            <div className="grid grid-cols-12 gap-8">
                {/* CỘT TRÁI: CAMERA & VOICE CONTROL */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div
                        ref={containerRef}
                        className={`
                            relative
                            bg-slate-900
                            overflow-hidden
                            shadow-2xl
                            border-[6px]
                            border-white
                            transition-all
                            duration-500
                            ${isFullscreen
                                ? 'fixed inset-0 z-[9999] rounded-none w-screen h-screen'
                                : 'rounded-[3.5rem] aspect-video'}
                        `}
                    >

                        {/* ================= FULLSCREEN ROBOT ================= */}
                        {isFullscreen && (
                            <div
                                className={`
                                    pointer-events-none
                                    transition-all
                                    duration-500
                                    animate-floatRobot

                                    ${isFullscreen
                                        ? `
                                        fixed
                                        bottom-6
                                        right-6
                                        w-[320px]
                                        h-[320px]
                                        z-[10000]
                                    `
                                        : `
                                        absolute
                                        bottom-4
                                        right-4
                                        w-[140px]
                                        h-[140px]
                                        z-30
                                    `
                                    }
                                `}
                            >
                                {/* Glow */}
                                <div
                                    className={`
                                        absolute
                                        inset-0
                                        rounded-full
                                        bg-cyan-400/20
                                        blur-3xl
                                        animate-pulse
                                    `}
                                />

                                <Canvas
                                    camera={{ position: [0, 0, 5], fov: 35 }}
                                    gl={{ preserveDrawingBuffer: true }}
                                >
                                    <ambientLight intensity={1.8} />

                                    <directionalLight
                                        position={[3, 3, 3]}
                                        intensity={2}
                                    />

                                    <pointLight
                                        position={[-3, 2, 2]}
                                        intensity={1.5}
                                        color="#67e8f9"
                                    />

                                    <Suspense fallback={null}>
                                        <Float
                                            speed={3}
                                            rotationIntensity={1}
                                            floatIntensity={2}
                                        >
                                            <EveRobot aiData={aiData} />
                                        </Float>

                                        <Environment preset="city" />
                                    </Suspense>
                                </Canvas>
                            </div>
                        )}

                        {/* ================= TIMER ================= */}
                        {aiData?.sitting_seconds !== undefined &&
                            aiData.sitting_seconds > 0 && (
                                <div className="absolute top-8 right-8 z-30">
                                    <div className="bg-orange-500/20 backdrop-blur-md border-2 border-orange-500 p-3 rounded-2xl flex flex-col items-end">
                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">
                                            Thời gian ngồi
                                        </span>

                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-white tabular-nums">
                                                {aiData.sitting_seconds || 0}
                                            </span>

                                            <span className="text-sm font-bold text-orange-500">
                                                giây
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        {/* ================= CAMERA FEED ================= */}
                        {cameraSource === 'device' ? (
                            <div className="relative w-full h-full overflow-hidden bg-black">

                                {/* VIDEO */}
                                <img
                                    src={
                                        lastFrame
                                            ? `data:image/jpeg;base64,${lastFrame}`
                                            : "/no-signal.png"
                                    }
                                    className="w-full h-full object-cover"
                                />

                                {/* RADAR */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="w-full h-[2px] bg-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-scan" />
                                </div>

                                {/* ================= OBJECT DETECTION ================= */}
                                {aiData.detected_objects?.map((obj, index) => {
                                    const [x1, y1, x2, y2] = obj.bbox;

                                    const isTV = obj.label.toLowerCase().includes('tv');
                                    const isChair = obj.label.toLowerCase().includes('ghế');

                                    const isSittingOn =
                                        isChair &&
                                        aiData.sitting_seconds &&
                                        aiData.sitting_seconds > 0;

                                    return (
                                        <div
                                            key={index}
                                            className="absolute pointer-events-none transition-all duration-300 ease-out"
                                            style={{
                                                left: `${(x1 / 640) * 100}%`,
                                                top: `${(y1 / 480) * 100}%`,
                                                width: `${((x2 - x1) / 640) * 100}%`,
                                                height: `${((y2 - y1) / 480) * 100}%`,

                                                border: `2px solid ${isTV
                                                    ? '#3b82f6'
                                                    : isSittingOn
                                                        ? '#f97316'
                                                        : '#22c55e'
                                                    }`,

                                                boxShadow: isSittingOn
                                                    ? '0 0 15px rgba(249,115,22,0.5)'
                                                    : 'none',

                                                borderRadius: '4px',
                                                zIndex: 40,
                                            }}
                                        >
                                            {/* LABEL */}
                                            <div
                                                className={`
                                    absolute
                                    -top-6
                                    left-0
                                    px-2
                                    py-0.5
                                    rounded-t-md
                                    text-[10px]
                                    font-black
                                    text-white
                                    flex
                                    items-center
                                    gap-1.5
                                    backdrop-blur-sm
                                    ${isTV
                                                        ? 'bg-blue-600/90'
                                                        : isSittingOn
                                                            ? 'bg-orange-600/90'
                                                            : 'bg-green-600/90'
                                                    }
                                `}
                                            >
                                                {isTV ? (
                                                    <Monitor size={10} />
                                                ) : isSittingOn ? (
                                                    <User size={10} />
                                                ) : (
                                                    <Activity size={10} />
                                                )}

                                                <span>{obj.label.toUpperCase()}</span>

                                                {isSittingOn && (
                                                    <span className="ml-1 bg-white text-orange-600 px-1.5 rounded-sm animate-pulse flex items-center gap-0.5">
                                                        <Clock size={8} />
                                                        {aiData.sitting_seconds}s
                                                    </span>
                                                )}
                                            </div>

                                            {/* CORNERS */}
                                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-inherit -mt-[2px] -ml-[2px]" />
                                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-inherit -mt-[2px] -mr-[2px]" />
                                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-inherit -mb-[2px] -ml-[2px]" />
                                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-inherit -mb-[2px] -mr-[2px]" />
                                        </div>
                                    );
                                })}

                                {/* WARNING */}
                                {aiData.is_warning && (
                                    <div className="absolute inset-0 border-[10px] border-red-500/40 animate-pulse pointer-events-none shadow-[inset_0_0_50px_rgba(239,68,68,0.4)]" />
                                )}
                            </div>
                        ) : (
                            <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                                <img
                                    src="https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1200"
                                    className="w-full h-full object-cover opacity-40"
                                    alt="Home"
                                />

                                <div className="absolute text-slate-400 flex flex-col items-center">
                                    <Loader2 className="animate-spin mb-2" />
                                    <span className="text-sm">
                                        Đang kết nối camera nhà...
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ================= AI RESPONSE ================= */}
                        {aiResponseText && (
                            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[85%] z-30">
                                <div className="bg-black/40 backdrop-blur-xl text-white p-5 rounded-[2rem] border border-white/20 animate-in slide-in-from-bottom-4 shadow-2xl">
                                    <p className="text-[9px] font-black text-blue-400 uppercase mb-1 tracking-widest">
                                        {selectedRelative.name} ĐANG NHẮC:
                                    </p>

                                    <p className="text-lg font-bold italic leading-tight text-blue-50">
                                        "{aiResponseText}"
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ================= MIC ================= */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
                            <div className="relative">

                                {isListening && (
                                    <>
                                        <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
                                        <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-10 delay-300" />
                                    </>
                                )}

                                <div
                                    className={`
                        p-6
                        rounded-full
                        shadow-2xl
                        transition-all
                        duration-700
                        border-4
                        ${isListening
                                            ? 'bg-blue-600 border-blue-400 scale-110'
                                            : isProcessing
                                                ? 'bg-indigo-600 border-indigo-400 animate-pulse'
                                                : 'bg-slate-700 border-slate-600 opacity-50'
                                        }
                    `}
                                >
                                    {isProcessing ? (
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <span className="w-2 h-2 bg-white rounded-full animate-bounce" />
                                        </div>
                                    ) : isListening ? (
                                        <div className="relative">
                                            <Mic
                                                className="text-white animate-pulse"
                                                size={28}
                                            />

                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                                        </div>
                                    ) : (
                                        <MicOff className="text-white/50" size={28} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ================= CONTROLS ================= */}
                        <div className="absolute top-8 left-8 right-8 z-40 flex items-center justify-between">

                            <div className="flex gap-2 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
                                <button
                                    onClick={() => setCameraSource('device')}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${cameraSource === 'device'
                                        ? 'bg-white text-slate-900 shadow-xl'
                                        : 'text-white/70 hover:bg-white/10'
                                        }`}
                                >
                                    <Camera size={14} />
                                    CAMERA AI
                                </button>

                                <button
                                    onClick={() => setCameraSource('home')}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${cameraSource === 'home'
                                        ? 'bg-white text-slate-900 shadow-xl'
                                        : 'text-white/70 hover:bg-white/10'
                                        }`}
                                >
                                    <HomeIcon size={14} />
                                    PHÒNG KHÁCH
                                </button>
                            </div>

                            {/* FULLSCREEN BUTTON */}
                            <button
                                onClick={toggleFullscreen}
                                className="
                                    w-14
                                    h-14
                                    rounded-2xl
                                    bg-black/30
                                    backdrop-blur-xl
                                    border
                                    border-white/10
                                    flex
                                    items-center
                                    justify-center
                                    text-white
                                    hover:scale-110
                                    transition-all
                                "
                            >
                                {isFullscreen ? <Minimize2 /> : <Maximize2 />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: ROBOT 3D & PHÂN TÍCH CHỈ SỐ */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="h-[600px] w-full bg-slate-50 rounded-[4rem] overflow-hidden border border-slate-100 shadow-xl relative group">

                        {/* Status Robot Overlay */}
                        <div className="absolute top-8 left-8 z-10 flex flex-col gap-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Agent Online</p>
                            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full w-fit border border-white">
                                <div className={`w-2 h-2 rounded-full ${aiData.is_warning ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">EVE-Companion v1</span>
                            </div>
                        </div>

                        <Canvas
                            shadows
                            camera={{ position: [0, 1, 6], fov: 35 }}
                            // Thêm đoạn xử lý này vào nè Luân
                            onCreated={({ gl }) => {
                                gl.shadowMap.type = 1; // 1 tương đương với THREE.PCFShadowMap
                            }}
                        >
                            <ambientLight intensity={1} />
                            <spotLight
                                position={[10, 10, 10]}
                                angle={0.15}
                                penumbra={1}
                                intensity={2}
                                castShadow
                            />
                            <directionalLight position={[0, 5, 5]} intensity={1} />

                            <Suspense fallback={null}>
                                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                                    <EveRobot aiData={aiData} />
                                </Float>
                                <Environment preset="city" />
                            </Suspense>

                            <OrbitControls enableZoom={false} makeDefault />
                        </Canvas>

                        {/* BIO-METRIC DASHBOARD OVERLAY */}
                        <div className="absolute bottom-8 left-8 right-8 z-10 grid grid-cols-2 gap-3">
                            {/* Card Cảm xúc - Bản nâng cấp chuyên nghiệp */}
                            <div className={`transition-all duration-500 p-4 rounded-[2rem] border shadow-lg ${aiData.emotion === "Căng thẳng" ? "bg-red-50 border-red-200 animate-pulse" :
                                aiData.emotion === "Buồn/Mệt mỏi" ? "bg-orange-50 border-orange-200" :
                                    "bg-white/80 backdrop-blur-md border-white"
                                }`}>
                                <div className="flex justify-between items-start">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Cảm xúc của Nội</p>

                                    {/* Dot cảnh báo nhỏ góc trên */}
                                    {(aiData.emotion === "Căng thẳng" || aiData.emotion === "Buồn/Mệt mỏi") && (
                                        <span className="relative flex h-2 w-2">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${aiData.emotion === "Căng thẳng" ? 'bg-red-400' : 'bg-orange-400'}`}></span>
                                            <span className={`relative inline-flex rounded-full h-2 w-2 ${aiData.emotion === "Căng thẳng" ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className={`text-3xl filter drop-shadow-md transition-transform duration-300 ${aiData.emotion === "Căng thẳng" ? "scale-125" : "scale-100"}`}>
                                        {aiData.emotion === "Vui vẻ" ? "😊" :
                                            aiData.emotion === "Buồn/Mệt mỏi" ? "😟" :
                                                aiData.emotion === "Căng thẳng" ? "😡" :
                                                    aiData.emotion === "Lo lắng" ? "😰" : "😐"}
                                    </div>

                                    <div className="flex flex-col">
                                        <span className={`text-[11px] font-black uppercase tracking-tight ${aiData.emotion === "Buồn/Mệt mỏi" ? 'text-orange-600' :
                                            aiData.emotion === "Căng thẳng" ? 'text-red-600' :
                                                aiData.emotion === "Vui vẻ" ? 'text-green-600' : 'text-blue-600'
                                            }`}>
                                            {aiData.emotion || "Đang phân tích..."}
                                        </span>

                                        {/* Thêm dòng trạng thái phụ để tăng tính AI */}
                                        <span className="text-[8px] text-slate-500 font-medium">
                                            {aiData.emotion === "Căng thẳng" ? "Cần chú ý ngay" :
                                                aiData.emotion === "Buồn/Mệt mỏi" ? "Ami đang an ủi..." : "Sức khỏe ổn định"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Tư thế */}
                            <div className={`p-4 rounded-[2rem] border shadow-lg transition-all duration-500 ${aiData.is_warning ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-400 text-white' : 'bg-white/80 backdrop-blur-md border-white text-slate-800'
                                }`}>
                                <p className={`text-[9px] font-black uppercase mb-2 ${aiData.is_warning ? 'text-white/70' : 'text-slate-400'}`}>Tình trạng tư thế</p>
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-full ${aiData.is_warning ? 'bg-white/20' : 'bg-slate-100'}`}>
                                        <Activity size={18} className={aiData.is_warning ? 'animate-bounce' : 'text-blue-500'} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-tight">
                                        {aiData.is_warning ? "Cần điều chỉnh" : "Bình thường"}
                                    </span>
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