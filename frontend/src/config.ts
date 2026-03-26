/// //<reference types="vite/client" />

// Cấu hình API URL cho backend Python
// Khi chạy production, set biến môi trường VITE_API_URL
//export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'https://vhu-emotional-home-companion.onrender.com'

///<reference types="vite/client" />
export const API_AI_URL = "http://localhost:8000";
// 1. Link Backend Java (Quản lý database, User, Hospital...)
export const API_JAVA_URL = (import.meta as any).env?.VITE_API_JAVA_URL
    ?? 'https://vhu-emotional-home-companion.onrender.com';

// 2. Link AI Python (Xử lý Emotion, Voice, Groq...)
//export const API_AI_URL = (import.meta as any).env?.VITE_API_AI_URL
//    ?? 'https://vhu-emotional-home-companion-ai.onrender.com';