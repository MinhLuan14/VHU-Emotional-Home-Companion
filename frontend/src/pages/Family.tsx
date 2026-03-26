import React from 'react';
import {
    Video,
    MessageCircle,
    Phone,
    Heart,
    Plus,
    Play,
    Image as ImageIcon,
    MoreVertical,
    Share2,
    Clock,
    MapPin,
    Send,
    Smile
} from 'lucide-react';

const Family: React.FC = () => {
    const familyMembers = [
        { name: 'Minh', relation: 'Con trai', status: 'Trực tuyến', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', story: true },
        { name: 'Tú', relation: 'Con gái', status: 'Đang làm việc', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', story: true },
        { name: 'An', relation: 'Cháu nội', status: 'Ở trường', avatar: 'https://images.unsplash.com/photo-1503910397258-41d3e21aa51e?auto=format&fit=crop&q=80&w=200', story: false },
        { name: 'Linh', relation: 'Cháu họ', status: 'Ngoại tuyến', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200', story: true },
    ];

    const sharedMoments = [
        { id: 1, type: 'video', thumbnail: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=600', title: 'Cháu An đá bóng', sender: 'Minh', date: '12 Thg 10', likes: 12 },
        { id: 2, type: 'image', thumbnail: 'https://images.unsplash.com/photo-1590073844006-3a44579430a7?auto=format&fit=crop&q=80&w=600', title: 'Bữa tối chủ nhật', sender: 'Tú', date: '10 Thg 10', likes: 8 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-10">
            {/* 1. STATUS BUBBLES (STORIES) */}
            <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                <button className="flex-shrink-0 flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-orange-500 hover:text-orange-500 transition-all">
                        <Plus size={24} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Bạn</span>
                </button>
                {familyMembers.map((member, idx) => (
                    <div key={idx} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group">
                        <div className={`w-16 h-16 rounded-3xl p-1 transition-transform group-hover:scale-110 ${member.story ? 'bg-gradient-to-tr from-orange-500 to-yellow-400' : 'bg-slate-200'}`}>
                            <img src={member.avatar} className="w-full h-full object-cover rounded-[1.2rem] border-2 border-white" alt="" />
                        </div>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{member.name}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* LEFT SIDE (4/12) */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* COUNTDOWN WIDGET */}
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-100 border border-slate-50 overflow-hidden relative">
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-4">Sum họp sắp tới</h3>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-orange-50 rounded-2xl text-orange-500">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-slate-700">Bữa tối Chủ Nhật</p>
                                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                        <MapPin size={12} /> Nhà bác Hùng
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 p-2 rounded-xl text-center">
                                    <p className="text-lg font-black text-slate-700">03</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Ngày</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-xl text-center">
                                    <p className="text-lg font-black text-slate-700">14</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Giờ</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-xl text-center">
                                    <p className="text-lg font-black text-slate-700">45</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Phút</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CONTACTS LIST */}
                    <div className="space-y-3">
                        <h3 className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px] px-4">Gọi nhanh</h3>
                        {familyMembers.slice(0, 3).map((member, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <img src={member.avatar} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                                        <div>
                                            <h4 className="font-black text-slate-700 text-sm">{member.name}</h4>
                                            <p className={`text-[10px] font-bold uppercase ${member.status === 'Trực tuyến' ? 'text-emerald-500' : 'text-slate-400'}`}>{member.status}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button className="p-2 text-slate-400 hover:text-orange-500 transition-colors"><Video size={18} /></button>
                                        <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Phone size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* QUICK MESSAGE BOX */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageCircle size={18} className="text-orange-500" />
                            <h4 className="text-sm font-black uppercase tracking-widest">Trò chuyện nhanh</h4>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Gửi lời yêu thương..."
                                className="w-full bg-slate-800 border-none rounded-2xl py-4 pl-4 pr-12 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-500 rounded-xl hover:scale-105 transition-transform">
                                <Send size={16} />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-4">
                            {['❤️', '👍', '☕', '🎂'].map(emoji => (
                                <button key={emoji} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-700 transition-colors">{emoji}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE (8/12) */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="flex justify-between items-end px-4">
                        <div>
                            <h3 className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px] mb-1">Thư viện</h3>
                            <h2 className="text-2xl font-black text-slate-700 uppercase">Kỷ niệm <span className="text-orange-500">Gia đình</span></h2>
                        </div>
                        <button className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50 transition-all">Xem Album</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sharedMoments.map((moment) => (
                            <div key={moment.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-gray-100 group">
                                <div className="relative aspect-[4/3]">
                                    <img src={moment.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                        <div className="flex items-center gap-4 text-white">
                                            <div className="flex items-center gap-1"><Heart size={16} fill="white" /> <span className="text-xs font-bold">{moment.likes}</span></div>
                                            <div className="flex items-center gap-1"><MessageCircle size={16} /> <span className="text-xs font-bold">4</span></div>
                                        </div>
                                    </div>
                                    {moment.type === 'video' && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-orange-500/90 rounded-full flex items-center justify-center text-white shadow-2xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                                            <Play size={24} fill="currentColor" className="ml-1" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-black text-slate-700 text-lg group-hover:text-orange-500 transition-colors">{moment.title}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Chia sẻ bởi {moment.sender} • {moment.date}</p>
                                        </div>
                                        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors"><MoreVertical size={18} className="text-slate-400" /></button>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {familyMembers.map((m, i) => (
                                            <img key={i} src={m.avatar} className="w-8 h-8 rounded-full border-2 border-white object-cover" alt="" />
                                        ))}
                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">+5</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* LIVE FAMILY MAP / ROOM - RE-STYLED */}
                    <div className="bg-gradient-to-br from-orange-500 to-rose-500 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-orange-200">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="text-center md:text-left space-y-2">
                                <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-2">Đang diễn ra</div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none italic">Phòng Gọi <br /> <span className="text-orange-200">Gia Đình</span></h3>
                                <p className="text-orange-100 text-sm font-medium opacity-80">3 thành viên sẵn sàng trò chuyện.</p>
                            </div>
                            <button className="group/btn relative px-10 py-5 bg-white text-orange-600 rounded-[2rem] font-black shadow-xl transition-all hover:scale-105 active:scale-95 overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    THAM GIA NGAY <Video size={20} />
                                </span>
                                <div className="absolute inset-0 bg-slate-900 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                                <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 z-20">
                                    VÀO THÔI!
                                </span>
                            </button>
                        </div>
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Family;