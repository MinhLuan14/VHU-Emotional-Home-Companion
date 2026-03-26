import React from 'react';
import {
    Trophy,
    Star,
    Flame,
    CheckCircle2,
    Play,
    Users,
    Camera,
    Heart,
    ChevronRight,
    Target
} from 'lucide-react';

const Challenge: React.FC = () => {
    const dailyChallenges = [
        { id: 1, title: 'Nụ cười ban mai', pts: 50, icon: '😊', desc: 'Mỉm cười trước ống kính trong 10 giây để bắt đầu ngày mới.', status: 'completed' },
        { id: 2, title: 'Uống đủ nước', pts: 30, icon: '💧', desc: 'Uống 2 lít nước mỗi ngày. AI sẽ theo dõi số lần bạn nâng ly.', status: 'in-progress' },
        { id: 3, title: 'Đi bộ nhẹ nhàng', pts: 100, icon: '🚶', desc: 'Đi bộ quanh phòng khách trong vòng 5 phút.', status: 'pending' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

            <div className="bg-gradient-to-br from-orange-500 to-rose-500 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center border border-white/30 shadow-inner">
                            <Trophy size={48} className="text-yellow-300" />
                        </div>
                        <div>
                            <p className="text-orange-100 font-black uppercase tracking-widest text-xs">Xếp hạng hiện tại</p>
                            <h2 className="text-4xl font-black">#1 trong Gia đình</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <Star size={16} fill="currentColor" className="text-yellow-300" />
                                <span className="font-bold text-lg">2,450 Điểm Hạnh Phúc</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex -space-x-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-12 h-12 rounded-full border-4 border-orange-500 bg-slate-200 overflow-hidden shadow-lg">
                                <img src={`https://i.pravatar.cc/150?u=${i}`} alt="Thành viên" />
                            </div>
                        ))}
                        <div className="w-12 h-12 rounded-full border-4 border-orange-500 bg-white flex items-center justify-center text-orange-500 font-black text-xs shadow-lg">
                            +2
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="font-black text-slate-700 uppercase tracking-tighter text-xl flex items-center gap-2">
                            <Flame className="text-orange-500" /> Nhiệm vụ hàng ngày
                        </h3>
                        <span className="text-xs font-black text-slate-400">HOÀN THÀNH 3/5</span>
                    </div>
                    <div className="space-y-4">
                        {dailyChallenges.map((task) => (
                            <div key={task.id} className={`p-6 rounded-[2.5rem] border transition-all flex items-center justify-between group ${task.status === 'completed' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 hover:shadow-xl'
                                }`}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-sm ${task.status === 'completed' ? 'bg-white text-emerald-500' : 'bg-slate-50'
                                        }`}>
                                        {task.status === 'completed' ? <CheckCircle2 size={32} /> : task.icon}
                                    </div>
                                    <div>
                                        <h4 className={`text-xl font-black ${task.status === 'completed' ? 'text-emerald-700 line-through opacity-60' : 'text-slate-700'}`}>
                                            {task.title}
                                        </h4>
                                        <p className="text-sm text-slate-500 font-medium">{task.desc}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-md">+{task.pts} ĐIỂM</span>
                                        </div>
                                    </div>
                                </div>
                                {task.status !== 'completed' && (
                                    <button className="p-4 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-100 hover:scale-105 transition-all">
                                        <Play size={20} fill="currentColor" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                            <div className="flex-1 space-y-4 text-center md:text-left">
                                <div className="inline-block px-4 py-1 bg-yellow-400 text-black rounded-full text-[10px] font-black uppercase tracking-widest">
                                    Sự kiện tuần
                                </div>
                                <h3 className="text-3xl font-black leading-tight">"Siêu đầu bếp Gia đình"</h3>
                                <p className="text-slate-400 text-sm">Quay video 1 phút về bữa trưa lành mạnh của bạn và chia sẻ với con cháu. Mọi người đều sẽ nhận được tim thưởng!</p>
                                <div className="flex gap-4 justify-center md:justify-start">
                                    <button className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-black text-sm hover:bg-orange-500 hover:text-white transition-all">
                                        <Camera size={18} /> QUAY VIDEO NGAY
                                    </button>
                                    <button className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl font-black text-sm hover:bg-white/20 transition-all">
                                        <Users size={18} /> MỜI GIA ĐÌNH
                                    </button>
                                </div>
                            </div>
                            <div className="w-48 h-48 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                                <Target size={80} className="text-yellow-400 animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
                        <h3 className="font-black text-slate-700 uppercase tracking-tighter mb-6">Đổi phần thưởng</h3>
                        <div className="space-y-4">
                            {[
                                { name: 'Bữa tối gia đình', cost: 5000, img: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=150' },
                                { name: 'Thẻ quà tặng', cost: 2000, img: 'https://images.unsplash.com/photo-1549465220-1d8c9d9c6703?auto=format&fit=crop&q=80&w=150' },
                            ].map((reward, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-3xl border border-slate-50 hover:bg-slate-50 transition-all cursor-pointer">
                                    <img src={reward.img} className="w-16 h-16 rounded-2xl object-cover shadow-sm" alt="" />
                                    <div className="flex-grow">
                                        <h4 className="font-black text-slate-700 text-sm">{reward.name}</h4>
                                        <p className="text-orange-500 font-black text-xs">{reward.cost} Trái tim</p>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-300" />
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all">
                            Xem tất cả phần thưởng
                        </button>
                    </div>
                    <div className="bg-emerald-500 rounded-[2.5rem] p-8 text-white shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-white/20 rounded-2xl">
                                <Flame size={32} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black">7 Ngày</h4>
                                <p className="text-emerald-100 text-[10px] font-black uppercase">Chuỗi ngày Hạnh phúc</p>
                            </div>
                        </div>
                        <div className="flex justify-between gap-2">
                            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                                <div key={i} className={`flex-1 aspect-square rounded-xl flex items-center justify-center font-black text-xs ${i < 4 ? 'bg-white text-emerald-500' : 'bg-emerald-600 text-emerald-300'}`}>
                                    {d}
                                </div>
                            ))}
                        </div>
                        <p className="mt-6 text-center text-xs font-bold text-emerald-50">Bạn đang làm rất tốt! 3 ngày nữa để nhận thưởng thêm.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Challenge;