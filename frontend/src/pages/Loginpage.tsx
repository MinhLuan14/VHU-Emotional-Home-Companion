import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Github, Chrome } from 'lucide-react';

import axios from 'axios'; // Bác nhớ cài: npm install axios

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {

            const response = await axios.post('http://localhost:8080/api/auth/login', {
                email,
                password
            });

            // Lưu token và chuyển hướng
            localStorage.setItem('token', response.data.token);
            window.location.href = '/dashboard';
        } catch (err) {
            setError('Email hoặc mật khẩu không đúng!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">

            {/* 1. Hiệu ứng Background (Giữ nguyên chiều sâu) */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 blur-[120px] rounded-full"></div>

            {/* 2. Login Card: Đã tối ưu kích thước để không bị mất phần bên phải trên Laptop */}
            <div className="w-full max-w-[1000px] lg:max-h-[85vh] grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden relative z-10">

                {/* PHẦN BÊN TRÁI: Form Đăng nhập (Tiếng Việt) */}
                <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center overflow-y-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-3">Chào mừng trở lại</h2>
                        <p className="text-slate-500 font-bold">Vui lòng nhập thông tin để kết nối với người thân.</p>
                    </div>

                    {/* Thông báo lỗi */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold animate-shake">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tài khoản / Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    type="text" // Đã đổi từ email -> text để bỏ kiểm tra @
                                    required
                                    value={email}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-[1.2rem] py-3.5 pl-12 pr-4 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-700 shadow-inner"
                                    placeholder="Nhập tài khoản hoặc email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mật khẩu</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-[1.2rem] py-3.5 pl-12 pr-4 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-700 shadow-inner"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center px-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm font-bold text-slate-500 group-hover:text-slate-800 transition-colors">Ghi nhớ</span>
                            </label>
                            <a href="#" className="text-sm font-black text-blue-600 hover:text-blue-800 transition-colors">Quên mật khẩu?</a>
                        </div>

                        <button
                            disabled={isLoading}
                            className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 md:py-5 rounded-[1.2rem] shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>ĐĂNG NHẬP <ArrowRight size={20} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative flex items-center justify-center mb-6">
                            <div className="w-full border-t border-slate-100"></div>
                            <span className="absolute bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Hoặc đăng nhập bằng</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button className="flex items-center justify-center gap-2 py-3 border-2 border-slate-50 rounded-xl hover:bg-slate-50 transition-all font-bold text-slate-600 text-sm">
                                <Chrome size={18} /> Google
                            </button>
                            <button className="flex items-center justify-center gap-2 py-3 border-2 border-slate-50 rounded-xl hover:bg-slate-50 transition-all font-bold text-slate-600 text-sm">
                                <Github size={18} /> Github
                            </button>
                        </div>
                    </div>
                </div>

                {/* PHẦN BÊN PHẢI: Visual & 3D Bot (Tối ưu hiển thị cho Laptop) */}
                <div className="hidden lg:flex bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 relative items-center justify-center overflow-hidden p-12 text-center">
                    <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] border-[40px] border-white/5 rounded-full"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] border-[20px] border-white/5 rounded-full"></div>

                    <div className="relative z-10 space-y-6">
                        {/* Bot AI thu nhỏ một chút để vừa màn hình Laptop */}
                        <div className="relative mx-auto w-48 h-48 md:w-56 md:h-56 drop-shadow-[0_35px_35px_rgba(0,0,0,0.4)] animate-bounce-slow">
                            <div className="w-full h-full bg-white/10 backdrop-blur-xl rounded-[3rem] border-2 border-white/30 p-4 shadow-inner">
                                <img
                                    src="../../src/assets/3DAI.png"
                                    alt="AI"
                                    className="w-full h-full object-cover rounded-[2.5rem]"
                                />
                            </div>
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/20 blur-2xl rounded-full"></div>
                        </div>

                        <div className="text-white space-y-3">
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Happiness Guardian AI</h2>
                            <p className="text-blue-100/80 font-medium leading-relaxed max-w-[280px] mx-auto text-sm">
                                Hệ thống phân tích hành vi tiên tiến cho sức khỏe của gia đình bạn.
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black text-white uppercase tracking-tighter">Hệ thống đã sẵn sàng cho Luân</span>
                        </div>
                    </div>
                </div>
            </div>

            <p className="absolute bottom-4 md:bottom-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest z-10 text-center">
                © 2026 Happiness Guardian • Bảo mật mã hóa 256-bit
            </p>
        </div>
    );
};

export default LoginPage;