import React from 'react';
import { ShieldCheck, Zap, Heart } from 'lucide-react';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="px-8 py-3 bg-white border-t border-gray-100 flex items-center justify-between">
            {/* Trái: Bản quyền & Tên dự án */}
            <div className="flex items-center gap-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    © {currentYear} <span className="text-orange-500">Future Care AI</span>
                </p>
                <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-gray-200">
                    <Heart size={10} className="text-rose-400 fill-rose-400" />
                    <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                        Chăm sóc bằng sự tận tâm
                    </span>
                </div>
            </div>

            {/* Phải: Trạng thái hệ thống & Phiên bản */}
            <div className="flex items-center gap-8">
                {/* Chỉ số Latency/System */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 group">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter group-hover:text-emerald-600 transition-colors">
                            Hệ thống ổn định
                        </span>
                    </div>
                    <div className="flex items-center gap-2 group">
                        <Zap size={14} className="text-orange-400" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                            Độ trễ: 24ms
                        </span>
                    </div>
                </div>

                {/* Version Label */}
                <div className="bg-slate-50 px-3 py-1 rounded-md border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">
                        v1.0.2 Stable
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;