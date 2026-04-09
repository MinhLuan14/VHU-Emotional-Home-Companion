import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const VideoStream = () => {
    const [frame, setFrame] = useState<string | null>(null);
    const [aiData, setAiData] = useState<any>({
        status: "",
        is_warning: false,
        emotion: "Ổn định",
        objects: [],
        sitting_seconds: 0
    });

    useEffect(() => {
        // Kết nối WebSocket đến Backend
        const ws = new WebSocket("ws://localhost:8000/ws/video");

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // 1. Cập nhật hình ảnh base64
            if (data.frame) {
                setFrame(`data:image/jpeg;base64,${data.frame}`);
            }

            // 2. Cập nhật dữ liệu AI tổng hợp
            if (data.status) {
                setAiData(data.status);
            }
        };

        ws.onclose = () => console.log("Mất kết nối với AI Backend");
        return () => ws.close();
    }, []);

    return (
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
            {/* 1. Luồng Video chính */}
            {frame ? (
                <div className="relative w-full h-full">
                    <img
                        src={frame}
                        className="w-full h-full object-cover"
                        alt="Ami AI Feed"
                    />

                    {/* 2. Hiệu ứng Radar Scanning */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="w-full h-[2px] bg-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-scan" />
                    </div>

                    {/* 3. Lớp phủ Bounding Boxes (Digital Twin) */}
                    {aiData.objects && aiData.objects.map((obj: any, index: number) => {
                        // Backend gửi bbox dạng [x1, y1, x2, y2]
                        if (!obj.bbox) return null;
                        const [x1, y1, x2, y2] = obj.bbox;

                        const isTV = obj.label.toLowerCase().includes('tv');
                        const isChair = obj.label.toLowerCase().includes('ghế') || obj.label.toLowerCase().includes('chair');
                        const isSittingOn = isChair && aiData.sitting_seconds > 0;

                        return (
                            <div
                                key={index}
                                className="absolute transition-all duration-300 pointer-events-none"
                                style={{
                                    left: `${(x1 / 640) * 100}%`,
                                    top: `${(y1 / 480) * 100}%`,
                                    width: `${((x2 - x1) / 640) * 100}%`,
                                    height: `${((y2 - y1) / 480) * 100}%`,
                                    border: `2px solid ${isTV ? '#3b82f6' : isSittingOn ? '#f97316' : '#22c55e'}`,
                                    boxShadow: isSittingOn ? '0 0 20px rgba(249, 115, 22, 0.6)' : 'none',
                                }}
                            >
                                <div className={`absolute -top-6 left-0 px-2 py-0.5 rounded-t text-[10px] font-bold text-white flex items-center gap-1
                                    ${isTV ? 'bg-blue-500' : isSittingOn ? 'bg-orange-500' : 'bg-green-500'}`}>
                                    {obj.label.toUpperCase()}
                                    {isSittingOn && (
                                        <span className="bg-white text-orange-600 px-1 rounded animate-pulse">
                                            ⏳ {aiData.sitting_seconds}s
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* 4. Cảnh báo đỏ nếu có Warning */}
                    {aiData.is_warning && (
                        <div className="absolute inset-0 border-[10px] border-red-500/40 animate-pulse pointer-events-none shadow-[inset_0_0_50px_rgba(239,68,68,0.4)]" />
                    )}

                    {/* 5. Overlay Text thông tin (Góc trái trên) */}
                    <div className="absolute top-4 left-4 bg-black/50 p-2 rounded text-white text-xs backdrop-blur-sm">
                        <p className="font-bold text-cyan-400">AMI INTELLIGENCE</p>
                        <p>Tâm trạng: {aiData.emotion}</p>
                        <p>Tư thế: {aiData.status}</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Loader2 className="animate-spin mb-2" />
                    <span className="text-sm">Đang kết nối Ami AI...</span>
                </div>
            )}
        </div>
    );
};

export default VideoStream;