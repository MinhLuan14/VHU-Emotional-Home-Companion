import React from 'react';
import {
    Facebook,
    Linkedin,
    Youtube,
    Heart,
    ShieldCheck,
    Mail,
    Phone,
    MapPin,
} from 'lucide-react';

import logo from '../../assets/logoi2.png';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#666666] text-white">

            {/* =========================
                MAIN FOOTER
            ========================== */}
            <div className="max-w-[1700px] mx-auto px-6 md:px-10 xl:px-16 py-14">

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-14">

                    {/* ======================================
                        CONTACT
                    ====================================== */}
                    <div>

                        <h2 className="text-[32px] font-black uppercase tracking-tight">
                            Contact Us
                        </h2>

                        <div className="w-40 h-[3px] bg-[#E2B300] mt-4 mb-7" />

                        <div className="space-y-6 text-[17px] leading-relaxed text-white/95">

                            <div className="space-y-3">

                                <div className="flex items-start gap-3">
                                    <MapPin
                                        size={20}
                                        className="text-[#E2B300] mt-1 flex-shrink-0"
                                    />

                                    <p>
                                        Emotional Home Companion (EHC)
                                        <br />
                                        AI chăm sóc sức khỏe tinh thần
                                        <br />
                                        Đồng hành cùng người cao tuổi
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">

                                <div className="flex items-center gap-3">
                                    <Phone
                                        size={18}
                                        className="text-[#E2B300]"
                                    />

                                    <p className="font-semibold">
                                        1900 9999
                                    </p>
                                </div>

                                <p className="italic text-white/80 text-[15px]">
                                    Hệ thống hỗ trợ AI hoạt động 24/7
                                </p>
                            </div>

                            <div className="flex items-center gap-3">

                                <Mail
                                    size={18}
                                    className="text-[#E2B300]"
                                />

                                <p>
                                    support@ehc-ai.vn
                                </p>
                            </div>
                        </div>

                        <div className="w-40 h-[2px] bg-[#E2B300] mt-8 mb-6" />

                        <p className="text-[16px] leading-relaxed text-white/90">
                            Nếu phát hiện tình huống khẩn cấp,
                            vui lòng liên hệ người thân hoặc cơ sở y tế gần nhất.
                            EHC hỗ trợ theo dõi và kết nối gia đình,
                            không thay thế chuyên gia điều trị.
                        </p>
                    </div>

                    {/* ======================================
                        SOCIAL
                    ====================================== */}
                    <div>

                        <h2 className="text-[32px] font-black uppercase tracking-tight">
                            Stay Connected
                        </h2>

                        <div className="w-40 h-[3px] bg-[#E2B300] mt-4 mb-7" />

                        <div className="flex items-center gap-5">

                            {/* FACEBOOK */}
                            <button
                                className="
                                    w-14
                                    h-14
                                    rounded-full
                                    border
                                    border-white/20
                                    flex
                                    items-center
                                    justify-center
                                    hover:bg-white/10
                                    transition-all
                                "
                            >
                                <Facebook size={24} />
                            </button>

                            {/* LINKEDIN */}
                            <button
                                className="
                                    w-14
                                    h-14
                                    rounded-full
                                    border
                                    border-white/20
                                    flex
                                    items-center
                                    justify-center
                                    hover:bg-white/10
                                    transition-all
                                "
                            >
                                <Linkedin size={24} />
                            </button>

                            {/* YOUTUBE */}
                            <button
                                className="
                                    w-14
                                    h-14
                                    rounded-full
                                    border
                                    border-white/20
                                    flex
                                    items-center
                                    justify-center
                                    hover:bg-white/10
                                    transition-all
                                "
                            >
                                <Youtube size={24} />
                            </button>
                        </div>

                        {/* FEATURES */}
                        <div className="mt-12">

                            <h2 className="text-[32px] font-black uppercase tracking-tight">
                                Explore
                            </h2>

                            <div className="w-40 h-[3px] bg-[#E2B300] mt-4 mb-7" />

                            <div className="flex flex-col gap-5 text-[18px] font-medium">

                                <a
                                    href="#"
                                    className="hover:text-[#E2B300] transition-colors"
                                >
                                    Giới thiệu dự án
                                </a>

                                <a
                                    href="#"
                                    className="hover:text-[#E2B300] transition-colors"
                                >
                                    Camera AI giám sát
                                </a>

                                <a
                                    href="#"
                                    className="hover:text-[#E2B300] transition-colors"
                                >
                                    Nhật ký sức khỏe
                                </a>

                                <a
                                    href="#"
                                    className="hover:text-[#E2B300] transition-colors"
                                >
                                    Kết nối gia đình
                                </a>

                                <a
                                    href="#"
                                    className="hover:text-[#E2B300] transition-colors"
                                >
                                    Tin tức & cộng đồng
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* ======================================
                        BRAND CENTER
                    ====================================== */}
                    <div className="flex flex-col items-center justify-center text-center">

                        <div
                            className="
                                w-[240px]
                                h-[240px]
                                rounded-[2rem]
                                bg-white/5
                                border
                                border-white/10
                                backdrop-blur-sm
                                p-5
                                shadow-2xl
                            "
                        >
                            <img
                                src={logo}
                                alt="EHC Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <h2
                            className="
                                mt-8
                                text-[52px]
                                font-black
                                tracking-tight
                                bg-gradient-to-r
                                from-orange-400
                                via-violet-400
                                to-blue-400
                                bg-clip-text
                                text-transparent
                            "
                        >
                            EHC
                        </h2>

                        <p className="text-[20px] text-white/90 font-semibold mt-2">
                            Emotional Home Companion
                        </p>

                        <div className="flex items-center gap-3 mt-6">

                            <Heart
                                size={18}
                                className="text-rose-400 fill-rose-400"
                            />

                            <span className="text-[15px] text-white/80">
                                AI thấu cảm — Đồng hành yêu thương
                            </span>
                        </div>
                    </div>

                    {/* ======================================
                        RIGHT SIDE
                    ====================================== */}
                    <div className="flex flex-col justify-between">

                        <div>

                            <div className="flex items-center gap-3">

                                <ShieldCheck
                                    size={24}
                                    className="text-emerald-400"
                                />

                                <h2 className="text-[28px] font-black uppercase">
                                    System Status
                                </h2>
                            </div>

                            <div className="w-40 h-[3px] bg-[#E2B300] mt-4 mb-7" />

                            <div className="space-y-5">

                                <div
                                    className="
                                        bg-white/5
                                        border
                                        border-white/10
                                        rounded-2xl
                                        p-5
                                    "
                                >
                                    <p className="text-[14px] uppercase tracking-[0.2em] text-white/60 font-bold">
                                        AI Monitoring
                                    </p>

                                    <div className="flex items-center gap-3 mt-3">

                                        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />

                                        <span className="text-[18px] font-bold">
                                            Hệ thống hoạt động ổn định
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className="
                                        bg-white/5
                                        border
                                        border-white/10
                                        rounded-2xl
                                        p-5
                                    "
                                >
                                    <p className="text-[14px] uppercase tracking-[0.2em] text-white/60 font-bold">
                                        AI Response
                                    </p>

                                    <p className="text-[28px] font-black mt-2">
                                        24ms
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* COPYRIGHT */}
                        <div className="mt-12">

                            <p className="text-[18px] leading-relaxed text-white/90">
                                © {currentYear} Emotional Home Companion.
                                <br />
                                All Rights Reserved.
                            </p>

                            <div className="flex flex-col gap-3 mt-7 text-[17px] font-semibold">

                                <a
                                    href="#"
                                    className="hover:text-[#E2B300] transition-colors"
                                >
                                    Terms of Service
                                </a>

                                <a
                                    href="#"
                                    className="hover:text-[#E2B300] transition-colors"
                                >
                                    Privacy Policy
                                </a>

                                <a
                                    href="#"
                                    className="hover:text-[#E2B300] transition-colors"
                                >
                                    Security
                                </a>

                                <a
                                    href="#"
                                    className="hover:text-[#E2B300] transition-colors"
                                >
                                    Cookie Policy
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* =========================
                BOTTOM BAR
            ========================== */}
            <div className="border-t border-white/10 bg-black/10">

                <div
                    className="
                        max-w-[1700px]
                        mx-auto
                        px-6
                        md:px-10
                        xl:px-16
                        py-5
                        flex
                        flex-col
                        md:flex-row
                        items-center
                        justify-between
                        gap-4
                    "
                >

                    <div className="flex items-center gap-3">

                        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />

                        <span className="text-[14px] text-white/80 font-medium">
                            AI Monitoring Active
                        </span>
                    </div>

                    <div className="text-[13px] text-white/60 tracking-widest uppercase font-bold">
                        EHC AI SYSTEM • v2.0 Stable
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;