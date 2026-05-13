import React, { useState } from 'react';
import {
    Home,
    BookOpen,
    Users,
    Trophy,
    LogIn,
    Menu,
    X,
    Camera,
} from 'lucide-react';

import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/logoi2.png';

interface HeaderProps {
    title?: string;
}

const Header: React.FC<HeaderProps> = () => {
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { name: 'VỀ CHÚNG TÔI', path: '/', icon: Home },
        { name: 'CAMERA GIÁM SÁT', path: '/Vision', icon: Camera },
        { name: 'NHẬT KÝ SỨC KHỎE', path: '/diary', icon: BookOpen },
        { name: 'KẾT NỐI GIA ĐÌNH', path: '/family', icon: Users },
        { name: 'TIN TỨC', path: '/news', icon: Trophy },
    ];

    return (
        <header className="top-0 z-50 w-full bg-white shadow-md">

            {/* =========================================================
                DESKTOP HEADER
                GIỮ NGUYÊN CHO LAPTOP / PC
            ========================================================== */}
            <div className="hidden xl:block bg-[#F3F3F3] border-b border-slate-200">

                <div className="max-w-[1700px] mx-auto px-8 2xl:px-10 py-5 flex items-center justify-between gap-10">

                    {/* LEFT SIDE */}
                    <Link
                        to="/"
                        className="flex items-center gap-6 group min-w-0"
                    >

                        {/* LOGO */}
                        <div
                            className="
                                w-[150px]
                                h-[150px]
                                2xl:w-[170px]
                                2xl:h-[170px]
                                rounded-[2rem]
                                bg-white
                                border
                                border-slate-200
                                shadow-sm
                                overflow-hidden
                                p-3
                                flex-shrink-0
                                transition-all
                                duration-300
                                group-hover:scale-[1.02]
                            "
                        >
                            <img
                                src={logo}
                                alt="EHC Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* TEXT */}
                        <div className="max-w-[650px]">

                            <h1
                                className="
                                    text-[46px]
                                    2xl:text-[60px]
                                    leading-none
                                    font-black
                                    tracking-tight
                                    bg-gradient-to-r
                                    from-orange-500
                                    via-violet-500
                                    to-blue-500
                                    bg-clip-text
                                    text-transparent
                                "
                            >
                                EHC
                            </h1>

                            <h2
                                className="
                                    text-[22px]
                                    2xl:text-[30px]
                                    leading-tight
                                    font-black
                                    text-slate-800
                                    uppercase
                                    tracking-tight
                                    mt-2
                                "
                            >
                                Emotional Home Companion
                            </h2>

                            <p
                                className="
                                    mt-4
                                    text-[15px]
                                    2xl:text-[17px]
                                    leading-relaxed
                                    text-slate-600
                                    font-medium
                                "
                            >
                                Hệ thống AI thấu cảm hỗ trợ sức khỏe tinh thần,
                                đồng hành cùng người cao tuổi bằng thị giác thông minh,
                                kết nối gia đình và bảo vệ quyền riêng tư tuyệt đối.
                            </p>

                            {/* FEATURES */}
                            <div className="flex flex-wrap items-center gap-4 mt-6">

                                {[
                                    {
                                        title: 'AI thấu cảm',
                                        gradient: 'from-violet-500 via-fuchsia-500 to-pink-500',
                                        glow: 'shadow-fuchsia-500/30',
                                        link: '/',
                                    },
                                    {
                                        title: 'Thị giác AI',
                                        gradient: 'from-sky-500 via-cyan-500 to-blue-500',
                                        glow: 'shadow-cyan-500/30',
                                        link: '/Vision',
                                    },
                                    {
                                        title: 'Bảo mật',
                                        gradient: 'from-emerald-500 via-teal-500 to-green-500',
                                        glow: 'shadow-emerald-500/30',
                                        link: '/security',
                                    },
                                    {
                                        title: 'Chi phí thấp',
                                        gradient: 'from-orange-400 via-amber-400 to-yellow-400',
                                        glow: 'shadow-orange-400/30',
                                        link: '/pricing',
                                    },
                                ].map((item, index) => (
                                    <Link
                                        key={index}
                                        to={item.link}
                                        className={`
                                group
                                relative
                                overflow-hidden
                                h-11
                                px-5
                                rounded-2xl
                                bg-gradient-to-r
                                ${item.gradient}
                                text-white
                                flex
                                items-center
                                gap-3
                                shadow-lg
                                ${item.glow}
                                hover:scale-105
                                hover:-translate-y-1
                                transition-all
                                duration-300
                            `}
                                    >

                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        <span
                                            className="
                                    relative
                                    text-[11px]
                                    uppercase
                                    tracking-[0.18em]
                                    font-black
                                    whitespace-nowrap
                                "
                                        >
                                            {item.title}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </Link>


                    {/* RIGHT SIDE */}
                    <div className="flex flex-col items-end gap-5 flex-shrink-0">

                        {/* TOP LINKS */}
                        <div className="flex items-center gap-6 text-[14px] font-semibold text-slate-600">

                            <Link
                                to="/contact"
                                className="hover:text-violet-600 transition-colors"
                            >
                                Liên hệ
                            </Link>

                            <button className="hover:text-violet-600 transition-colors">
                                English
                            </button>
                        </div>

                        {/* SOCIAL */}
                        <div className="flex items-center gap-3">

                            {/* FACEBOOK */}
                            <button className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-blue-50 transition-all shadow-sm">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-5 h-5 text-blue-500"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M22 12A10 10 0 1 0 10.5 21.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.8 3.7-3.8 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5v1.8h2.8L16 15h-2.4v7A10 10 0 0 0 22 12z" />
                                </svg>
                            </button>

                            {/* TWITTER */}
                            <button className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-sky-50 transition-all shadow-sm">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-5 h-5 text-sky-500"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M22.46 6c-.77.35-1.5.58-2.3.69a4 4 0 0 0 1.75-2.2 8 8 0 0 1-2.54.97 4 4 0 0 0-6.8 3.65A11.4 11.4 0 0 1 3 4.8a4 4 0 0 0 1.24 5.35 3.8 3.8 0 0 1-1.8-.5v.05a4 4 0 0 0 3.2 3.93 4 4 0 0 1-1.8.07 4 4 0 0 0 3.73 2.77A8 8 0 0 1 2 18.58 11.3 11.3 0 0 0 8.29 20c7.55 0 11.67-6.26 11.67-11.69V7.8A8.2 8.2 0 0 0 22.46 6z" />
                                </svg>
                            </button>

                            {/* YOUTUBE */}
                            <button className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 transition-all shadow-sm">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-5 h-5 text-red-500"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M21.8 8s-.2-1.5-.8-2.2c-.8-.9-1.6-.9-2-1C16.2 4.5 12 4.5 12 4.5h0s-4.2 0-7 .3c-.4 0-1.2 0-2 .9C2.4 6.5 2.2 8 2.2 8S2 9.8 2 11.6v1.7C2 15 2.2 17 2.2 17s.2 1.5.8 2.2c.8.9 1.9.9 2.4 1 1.8.2 6.6.3 6.6.3s4.2 0 7-.3c.4 0 1.2 0 2-.9.6-.7.8-2.2.8-2.2s.2-1.8.2-3.6v-1.7C22 9.8 21.8 8 21.8 8zM9.7 15.2V8.8l6.1 3.2-6.1 3.2z" />
                                </svg>
                            </button>
                        </div>

                        {/* BUTTONS */}
                        <div className="flex items-center gap-3">

                            <button
                                className="
                                    h-14
                                    px-7
                                    rounded-2xl
                                    bg-[#E5B300]
                                    hover:bg-[#d6a700]
                                    text-slate-900
                                    font-black
                                    text-[13px]
                                    tracking-wide
                                    shadow-sm
                                    transition-all
                                "
                            >
                                HỖ TRỢ DỰ ÁN
                            </button>

                            <button
                                className="
                                    h-14
                                    px-7
                                    rounded-2xl
                                    bg-gradient-to-r
                                    from-violet-600
                                    to-indigo-500
                                    hover:opacity-90
                                    text-white
                                    font-black
                                    text-[13px]
                                    tracking-wide
                                    shadow-sm
                                    transition-all
                                "
                            >
                                KẾT NỐI GIA ĐÌNH
                            </button>

                            <Link
                                to="/login"
                                className="
                                    h-14
                                    px-7
                                    rounded-2xl
                                    bg-[#5B5CEB]
                                    hover:bg-[#4d4ed8]
                                    text-white
                                    font-black
                                    text-[13px]
                                    tracking-wide
                                    shadow-sm
                                    transition-all
                                    flex
                                    items-center
                                    gap-3
                                "
                            >
                                <LogIn size={18} />
                                ĐĂNG NHẬP
                            </Link>
                        </div>
                    </div>
                </div>
            </div >

            {/* =========================================================
                TABLET HEADER
            ========================================================== */}
            <div className="hidden md:block xl:hidden bg-[#F3F3F3] border-b border-slate-200" >

                <div className="px-5 py-4 flex items-center justify-between">

                    {/* LEFT */}
                    <Link
                        to="/"
                        className="flex items-center gap-4 min-w-0"
                    >
                        <div className="w-20 h-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex-shrink-0">
                            <img
                                src={logo}
                                alt="Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 via-violet-500 to-blue-500 bg-clip-text text-transparent">
                                EHC
                            </h1>

                            <h2 className="text-base font-black text-slate-800 uppercase">
                                Emotional Home Companion
                            </h2>

                            <p className="text-sm text-slate-500 mt-1 line-clamp-2 max-w-[400px]">
                                AI đồng hành sức khỏe tinh thần người cao tuổi
                            </p>
                        </div>
                    </Link>

                    {/* RIGHT */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto">

                        <Link
                            to="/login"
                            className="
                                h-11
                                px-4
                                rounded-xl
                                bg-[#5B5CEB]
                                text-white
                                font-bold
                                flex
                                items-center
                                gap-2
                                shadow-sm
                            "
                        >
                            <LogIn size={17} />
                            Đăng nhập
                        </Link>

                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="
                                w-11
                                h-11
                                rounded-xl
                                bg-white
                                border
                                border-slate-200
                                flex
                                items-center
                                justify-center
                                shadow-sm
                                ml-1
                            "
                        >
                            {isMenuOpen ? (
                                <X size={22} />
                            ) : (
                                <Menu size={22} />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* =========================================================
                MOBILE HEADER
            ========================================================== */}
            <div className="md:hidden bg-white border-b border-slate-200" >

                <div className="px-4 py-3 flex items-center justify-between">

                    {/* LEFT */}
                    <Link
                        to="/"
                        className="flex items-center gap-3 min-w-0 flex-1"
                    >

                        <div className="w-14 h-14 rounded-2xl bg-[#F8F8F8] border border-slate-200 p-2 flex-shrink-0">
                            <img
                                src={logo}
                                alt="Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <div className="min-w-0 overflow-hidden">

                            <h1 className="text-2xl font-black bg-gradient-to-r from-orange-500 via-violet-500 to-blue-500 bg-clip-text text-transparent">
                                EHC
                            </h1>

                            <p className="text-[11px] font-semibold text-slate-500 leading-tight truncate">
                                Emotional Home Companion
                            </p>
                        </div>
                    </Link>

                    {/* RIGHT */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto">

                        <Link
                            to="/login"
                            className="
                                w-10
                                h-10
                                rounded-xl
                                bg-[#5B5CEB]
                                text-white
                                flex
                                items-center
                                justify-center
                                shadow-sm
                            "
                        >
                            <LogIn size={17} />
                        </Link>

                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="
                                w-10
                                h-10
                                rounded-xl
                                bg-slate-100
                                border
                                border-slate-200
                                flex
                                items-center
                                justify-center
                                shadow-sm
                            "
                        >
                            {isMenuOpen ? (
                                <X size={20} />
                            ) : (
                                <Menu size={20} />
                            )}
                        </button>
                    </div>
                </div>
            </div >

            {/* =========================================================
                DESKTOP NAVIGATION
            ========================================================== */}
            <div className="hidden xl:block bg-[#4B4B4B] text-white" >

                <div className="max-w-[1700px] mx-auto flex items-center justify-center">

                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`
                                relative
                                px-8
                                2xl:px-10
                                py-5
                                text-[13px]
                                uppercase
                                tracking-[0.16em]
                                font-black
                                transition-all
                                ${isActive(item.path)
                                    ? 'bg-[#5a5a5a]'
                                    : 'hover:bg-[#5a5a5a]'
                                }
                            `}
                        >
                            {item.name}

                            {isActive(item.path) && (
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-400" />
                            )}
                        </Link>
                    ))}
                </div>
            </div >

            {/* =========================================================
                MOBILE / TABLET DRAWER
            ========================================================== */}
            {
                isMenuOpen && (
                    <div className="xl:hidden bg-[#4B4B4B] text-white shadow-2xl animate-in slide-in-from-top duration-300">

                        <div className="flex flex-col">

                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`
                                    flex
                                    items-center
                                    gap-4
                                    px-6
                                    py-5
                                    border-b
                                    border-white/10
                                    font-bold
                                    text-sm
                                    tracking-wide
                                    transition-all
                                    ${isActive(item.path)
                                            ? 'bg-white/10'
                                            : 'hover:bg-white/5'
                                        }
                                `}
                                >
                                    <item.icon size={20} />
                                    <span>{item.name}</span>
                                </Link>
                            ))}

                            {/* ACTIONS */}
                            <div className="p-5 space-y-3 bg-black/10">

                                <button className="w-full h-12 rounded-xl bg-[#E5B300] text-slate-900 font-black text-sm">
                                    HỖ TRỢ DỰ ÁN
                                </button>

                                <button className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-black text-sm">
                                    KẾT NỐI GIA ĐÌNH
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </header >
    );
};

export default Header;