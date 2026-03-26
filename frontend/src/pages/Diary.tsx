import React from 'react';
import {
    Calendar as CalendarIcon,
    Filter,
    Download,
    Smile,
    Meh,
    Frown,
    TrendingUp,
    Activity,
    ChevronRight,
    ArrowUpRight,
    Zap,
    Info,
    MoreHorizontal
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    Bar,
    Line,
    ComposedChart,
    Cell,
    BarChart
} from 'recharts';

// Dữ liệu chi tiết: Hạnh phúc (đường), Tương tác xã hội (cột)
const detailedData = [
    { day: 'Thứ 2', happiness: 65, social: 40, active: 30 },
    { day: 'Thứ 3', happiness: 45, social: 25, active: 50 },
    { day: 'Thứ 4', happiness: 85, social: 90, active: 70 },
    { day: 'Thứ 5', happiness: 50, social: 35, active: 40 },
    { day: 'Thứ 6', happiness: 75, social: 65, active: 60 },
    { day: 'Thứ 7', happiness: 95, social: 92, active: 85 },
    { day: 'CN', happiness: 80, social: 75, active: 55 },
];

const hourlyAnalysis = [
    { time: 'Sáng', level: 80, color: '#fb923c' },
    { time: 'Trưa', level: 60, color: '#f97316' },
    { time: 'Chiều', level: 45, color: '#ea580c' },
    { time: 'Tối', level: 92, color: '#c2410c' },
];

const Diary: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-10">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-700 tracking-tight uppercase">
                        Nhật Ký <span className="text-orange-500">Cảm Xúc</span>
                    </h2>
                    <p className="text-slate-500 font-medium italic">Theo dõi hành trình tìm kiếm hạnh phúc mỗi ngày.</p>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Filter size={18} /> Bộ lọc
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-100">
                        <Download size={18} /> Xuất PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* LEFT: ADVANCED ANALYTICS (7/12) */}
                <div className="col-span-12 lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-700 uppercase tracking-tighter">Chỉ số Tương quan</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Hạnh phúc vs Tương tác xã hội</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-200"></span> Xã hội</span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Hạnh phúc</span>
                            </div>
                        </div>

                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={detailedData}>
                                    <defs>
                                        <linearGradient id="colorHappiness" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={10} />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                    />
                                    {/* Cột Social Interaction */}
                                    <Bar dataKey="social" name="Tương tác" barSize={35} fill="#f1f5f9" radius={[10, 10, 10, 10]} />
                                    {/* Vùng Happiness */}
                                    <Area type="monotone" dataKey="happiness" name="Hạnh phúc" stroke="#f97316" strokeWidth={4} fill="url(#colorHappiness)" />
                                    <Line type="monotone" dataKey="happiness" stroke="#f97316" strokeWidth={4} dot={{ r: 6, fill: '#f97316', strokeWidth: 3, stroke: '#fff' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-[2rem] flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                                    <ArrowUpRight size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase">Tăng trưởng tuần</p>
                                    <p className="text-sm font-black text-slate-700">+12% Hạnh phúc</p>
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-[2rem] flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-600 uppercase">Tác động tích cực</p>
                                    <p className="text-sm font-black text-slate-700">Gọi cho người thân</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Biểu đồ phân tích theo buổi */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
                        <h4 className="font-black text-slate-700 uppercase tracking-tighter mb-6 flex items-center gap-2">
                            <Info size={18} className="text-slate-400" /> Phân bổ cảm xúc trong ngày
                        </h4>
                        <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourlyAnalysis} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="time" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 800 }} width={80} />
                                    <Bar dataKey="level" name="Mức độ" radius={[0, 12, 12, 0]} barSize={20}>
                                        {hourlyAnalysis.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* RIGHT: CALENDAR MINI (5/12) */}
                <div className="col-span-12 lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <CalendarIcon className="text-orange-500" />
                                <h3 className="font-black text-slate-700 uppercase tracking-tighter">Tháng 3, 2026</h3>
                            </div>
                            <button className="text-slate-300 hover:text-slate-600 transition-colors"><MoreHorizontal size={20} /></button>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                                <div key={d} className="text-center text-[10px] font-black text-slate-400 py-2 tracking-widest">{d}</div>
                            ))}
                            {Array.from({ length: 31 }).map((_, i) => (
                                <div key={i} className={`aspect-square flex items-center justify-center rounded-2xl text-sm font-bold cursor-pointer transition-all relative group
                                    ${i === 16 ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-110 z-10' : 'hover:bg-orange-50 text-slate-600'}
                                    ${[2, 8, 15, 22].includes(i) ? 'after:content-[""] after:absolute after:bottom-2 after:w-1 after:h-1 after:bg-emerald-400 after:rounded-full' : ''}
                                `}>
                                    {i + 1}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                                        Tâm trạng: Tốt
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 p-5 bg-gradient-to-br from-slate-50 to-orange-50/30 rounded-[2rem] border border-dashed border-orange-200 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-orange-600 uppercase mb-2 flex items-center gap-2">
                                    <Activity size={12} /> Ghi chú trong ngày
                                </p>
                                <p className="text-sm text-slate-600 italic leading-relaxed">
                                    "Bác Hùng đã có một ngày tuyệt vời khi trò chuyện cùng cháu Minh trong 20 phút."
                                </p>
                            </div>
                            <Smile size={60} className="absolute -bottom-4 -right-4 text-orange-100/50 rotate-12" />
                        </div>
                    </div>
                </div>

                {/* BOTTOM: DETAILED HISTORY (12/12) */}
                <div className="col-span-12 space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="text-xl font-black text-slate-700">Lịch sử chi tiết</h3>
                        <button className="text-sm font-bold text-orange-500 hover:underline">Xem tất cả</button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {[
                            { time: 'Hôm nay, 10:30 SA', icon: <Smile className="text-emerald-500" />, title: 'Cảm thấy vui vẻ', desc: 'AI phát hiện biểu cảm tích cực trong cuộc gọi video.', tags: ['Gọi Video', 'Gia đình'], bg: 'bg-emerald-50/30' },
                            { time: 'Hôm qua, 03:15 CH', icon: <Meh className="text-orange-500" />, title: 'Trạng thái bình ổn', desc: 'Bác ngồi trong vườn 40 phút, tinh thần thư thái.', tags: ['Thư giãn'], bg: 'bg-orange-50/30' },
                            { time: '15 Thg 3 2026, 08:00 CH', icon: <Frown className="text-rose-500" />, title: 'Có dấu hiệu buồn bã', desc: 'AI phát hiện tiếng thở dài. Gợi ý mở nhạc cổ điển.', tags: ['AI Gợi ý'], bg: 'bg-rose-50/30' },
                        ].map((log, idx) => (
                            <div key={idx} className={`p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-all cursor-pointer group ${log.bg}`}>
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                        {log.icon}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.time}</p>
                                        <h4 className="text-lg font-black text-slate-700">{log.title}</h4>
                                        <p className="text-sm text-slate-500 font-medium">{log.desc}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="hidden md:flex gap-2">
                                        {log.tags.map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-white/50 backdrop-blur-sm border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg uppercase">{tag}</span>
                                        ))}
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:shadow-md transition-all">
                                        <ChevronRight size={24} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Diary;