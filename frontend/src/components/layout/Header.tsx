import React, { useState } from 'react';
import { Bell, Circle, User, Home, BookOpen, Users, Trophy, LogIn, Menu, X, Camera } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/LOGO.png'

interface HeaderProps {
    title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { name: 'Trang chủ', path: '/', icon: Home },
        { name: 'Camera', path: '/Vision', icon: Camera },
        { name: 'Nhật ký', path: '/diary', icon: BookOpen },
        { name: 'Gia đình', path: '/family', icon: Users },
        { name: 'Thử thách', path: '/challenge', icon: Trophy },
    ];

    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b-2 border-elderly-soft shadow-sm">
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">

                    {/* 1. Logo & Status Section */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-100 group-hover:rotate-6 transition-transform border border-orange-100 overflow-hidden">
                                <img
                                    src={logo}
                                    alt="Logo"
                                    className="w-full h-full object-contain p-1"
                                />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-lg md:text-xl font-black text-elderly-accent tracking-tighter uppercase leading-none">
                                    Nhà Cửa Thông Minh Cảm Xúc
                                </h1>
                                <p className="text-[9px] text-gray-400 font-bold mt-1 tracking-[0.15em]">ĐỒNG HÀNH CẢM XÚC</p>
                            </div>
                        </Link>

                        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                            <Circle size={8} fill="#16a34a" className="text-green-600 animate-pulse" />
                            <span className="text-[10px] font-bold text-green-700 uppercase">Hệ thống sẵn sàng</span>
                        </div>
                    </div>

                    {/* 2. Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${isActive(item.path)
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                                    : 'text-slate-500 hover:bg-orange-50 hover:text-orange-600'
                                    }`}
                            >
                                <item.icon size={18} />
                                <span className="text-sm">{item.name}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* 3. Actions Section */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <button className="relative p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all">
                            <Bell size={22} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>

                        <Link
                            to="/login"
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-500 text-orange-500 rounded-xl font-bold hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                        >
                            <LogIn size={18} />
                            <span className="text-sm">Đăng nhập</span>
                        </Link>

                        <div className="hidden sm:flex w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center text-slate-400">
                            <User size={20} />
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. Mobile Navigation Drawer */}
            {isMenuOpen && (
                <div className="lg:hidden bg-white border-t border-slate-100 p-4 space-y-2 animate-in slide-in-from-top duration-300">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMenuOpen(false)}
                            className={`flex items-center gap-4 px-4 py-4 rounded-xl font-bold ${isActive(item.path)
                                ? 'bg-orange-500 text-white'
                                : 'text-slate-600 bg-slate-50'
                                }`}
                        >
                            <item.icon size={20} />
                            <span>{item.name}</span>
                        </Link>
                    ))}
                    <Link
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-orange-600 bg-orange-50 border border-orange-200"
                    >
                        <LogIn size={20} />
                        <span>Đăng nhập</span>
                    </Link>
                </div>
            )}
        </header>
    );
};

export default Header;