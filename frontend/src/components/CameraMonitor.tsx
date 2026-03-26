// Gợi ý logic xử lý Camera
import React, { useRef, useEffect } from 'react';

const CameraMonitor = () => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        async function setupCamera() {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
        }
        setupCamera();
    }, []);

    return (
        <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-xl">
            <video ref={videoRef} autoPlay className="w-full h-auto mirror" />
            <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                AI ACTIVE
            </div>
        </div>
    );
};