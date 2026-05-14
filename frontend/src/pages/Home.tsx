import React from 'react';
import {
    Heart,
    Shield,
    Brain,
    Camera,
    Activity,
    Users,
    ChevronRight,
    Sparkles,
    Mic,
    Phone,
    CheckCircle2,
    AlertTriangle,
    Smile,
} from 'lucide-react';

const Home: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#F4F6FB] overflow-hidden">

            {/* =========================================================
                HERO SECTION
            ========================================================== */}
            <section className="relative bg-[#07111F] overflow-hidden">

                {/* BG */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#1D4ED8_0%,transparent_35%)] opacity-30"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,#7C3AED_0%,transparent_35%)] opacity-20"></div>
                </div>

                <div className="relative max-w-[1700px] mx-auto px-6 xl:px-10 py-8">

                    <div className="grid xl:grid-cols-[1.1fr_1fr_380px] gap-8 items-center min-h-[820px]">

                        {/* =========================================================
                            LEFT CONTENT
                        ========================================================== */}
                        <div className="pt-10">

                            <div className="flex flex-wrap gap-4 mb-10">

                                <div className="h-14 px-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3 text-white font-bold">
                                    <Brain size={20} className="text-cyan-400" />
                                    AI thấu cảm
                                </div>

                                <div className="h-14 px-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3 text-white font-bold">
                                    <Shield size={20} className="text-emerald-400" />
                                    Zero Cloud Privacy
                                </div>
                            </div>

                            <h1 className="text-white text-[4rem] md:text-[5rem] leading-[0.95] font-black tracking-[-0.05em] max-w-4xl">
                                Không ai nên
                                <span className="block text-[#5EA2FF]">
                                    già đi trong cô đơn.
                                </span>
                            </h1>

                            <p className="mt-10 text-xl leading-relaxed text-slate-300 max-w-2xl">
                                EHC – AI đồng hành cảm xúc giúp phát hiện sớm cô đơn,
                                trầm cảm và nguy cơ té ngã cho người cao tuổi bằng
                                công nghệ Edge AI riêng tư tuyệt đối.
                            </p>

                            {/* FEATURES */}
                            <div className="grid md:grid-cols-3 gap-5 mt-12">

                                {[
                                    {
                                        icon: Heart,
                                        title: 'Thấu cảm',
                                        desc: 'Chủ động hỏi han và lắng nghe.',
                                        color: 'text-pink-400',
                                    },
                                    {
                                        icon: Activity,
                                        title: 'An toàn',
                                        desc: 'Phát hiện té ngã thời gian thực.',
                                        color: 'text-cyan-400',
                                    },
                                    {
                                        icon: Shield,
                                        title: 'Riêng tư',
                                        desc: 'Không lưu hình ảnh người dùng.',
                                        color: 'text-emerald-400',
                                    },
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className="rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl p-6"
                                    >
                                        <item.icon
                                            size={30}
                                            className={item.color}
                                        />

                                        <h3 className="text-white text-xl font-black mt-5">
                                            {item.title}
                                        </h3>

                                        <p className="text-slate-400 leading-relaxed mt-2">
                                            {item.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* CTA */}
                            <div className="flex flex-wrap gap-5 mt-12">

                                <button className="h-16 px-8 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] transition-all text-white font-black text-lg flex items-center gap-3 shadow-[0_20px_60px_rgba(59,130,246,0.35)]">
                                    Xem Demo
                                </button>

                                <button className="h-16 px-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all text-white font-black text-lg flex items-center gap-3">
                                    Tìm hiểu công nghệ
                                </button>

                                <button className="h-16 px-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all text-white font-black text-lg flex items-center gap-3">
                                    <Mic size={20} />
                                    Trải nghiệm AI Companion
                                </button>
                            </div>
                        </div>

                        {/* =========================================================
                            CENTER IMAGE
                        ========================================================== */}
                        <div className="relative h-[760px] hidden xl:block">

                            <img
                                src="../../assets/HinhfBanner1.png"
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover rounded-[3rem]"
                            />

                            <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-t from-[#07111F] via-transparent to-transparent"></div>

                        </div>

                        {/* =========================================================
                            RIGHT STATUS CARD
                        ========================================================== */}
                        <div className="rounded-[2.8rem] bg-white/5 border border-white/10 backdrop-blur-2xl p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">

                            <p className="text-slate-400 uppercase tracking-[0.2em] text-sm font-black">
                                Trạng thái hiện tại
                            </p>

                            <div className="mt-8 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 px-5 py-4 flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-300 text-sm font-bold uppercase tracking-widest">
                                        Tâm trạng
                                    </p>

                                    <h3 className="text-white text-2xl font-black mt-1">
                                        Vui vẻ 😊
                                    </h3>
                                </div>

                                <Smile className="text-emerald-300" size={40} />
                            </div>

                            <div className="space-y-6 mt-10">

                                {[
                                    {
                                        label: 'Điểm hạnh phúc',
                                        value: '85/100',
                                    },
                                    {
                                        label: 'Thời gian vận động',
                                        value: '45 phút',
                                    },
                                    {
                                        label: 'Nguy cơ té ngã',
                                        value: 'Thấp',
                                    },
                                    {
                                        label: 'Đã trò chuyện cùng AI',
                                        value: '18 phút',
                                    },
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between border-b border-white/5 pb-5"
                                    >
                                        <p className="text-slate-400 text-lg">
                                            {item.label}
                                        </p>

                                        <p className="text-white font-black text-xl">
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full h-16 rounded-2xl bg-white/10 hover:bg-white/15 transition-all mt-10 text-white text-lg font-black">
                                Xem chi tiết
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* =========================================================
                STATS SECTION
            ========================================================== */}
            <section className="relative z-20 -mt-20">

                <div className="max-w-[1700px] mx-auto px-6 xl:px-10">

                    <div className="grid xl:grid-cols-[1.2fr_1fr_1fr_1fr] gap-6">

                        {/* BIG CARD */}
                        <div className="rounded-[2.5rem] bg-white p-10 shadow-[0_10px_60px_rgba(15,23,42,0.08)] border border-gray-100">

                            <h2 className="text-[3rem] leading-[1.05] font-black text-slate-800">
                                Vấn đề có thật.
                                <br />
                                Tác động thật.
                            </h2>

                            <p className="mt-6 text-slate-500 text-xl leading-relaxed max-w-xl">
                                Cô đơn và trầm cảm ở người cao tuổi đang âm thầm ảnh hưởng đến hàng triệu gia đình Việt Nam.
                            </p>

                            <button className="mt-8 h-14 px-7 rounded-2xl bg-[#EDF4FF] hover:bg-[#DCEBFF] transition-all text-blue-600 font-black">
                                Tìm hiểu thêm
                            </button>
                        </div>

                        {/* STAT */}
                        {[
                            {
                                value: '20.2%',
                                text: 'Người cao tuổi Việt Nam có dấu hiệu trầm cảm',
                                color: 'text-blue-500',
                            },
                            {
                                value: '39.4%',
                                text: 'Người già cảm thấy cô đơn sau COVID-19',
                                color: 'text-violet-500',
                            },
                            {
                                value: '16.6%',
                                text: 'Ca tử vong do tự sát thuộc nhóm >70 tuổi',
                                color: 'text-pink-500',
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_10px_60px_rgba(15,23,42,0.08)]"
                            >

                                <div className={`text-5xl font-black ${item.color}`}>
                                    {item.value}
                                </div>

                                <p className="mt-5 text-slate-500 text-lg leading-relaxed">
                                    {item.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* =========================================================
                DIFFERENCE SECTION
            ========================================================== */}
            <section className="py-28">

                <div className="max-w-[1700px] mx-auto px-6 xl:px-10">

                    <div className="text-center mb-16">

                        <h2 className="text-6xl font-black text-slate-800 tracking-[-0.04em]">
                            EHC khác biệt như thế nào?
                        </h2>

                        <p className="mt-6 text-slate-500 text-xl max-w-3xl mx-auto">
                            Không chỉ theo dõi sức khỏe thể chất, EHC còn đồng hành cảm xúc như một người thân thật sự.
                        </p>
                    </div>

                    <div className="grid xl:grid-cols-[1fr_120px_1fr] gap-8 items-center">

                        {/* OLD */}
                        <div className="rounded-[3rem] bg-white border border-gray-100 shadow-[0_10px_60px_rgba(15,23,42,0.08)] overflow-hidden">

                            <div className="relative h-[320px]">
                                <img
                                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1400&auto=format&fit=crop"
                                    alt=""
                                    className="w-full h-full object-cover"
                                />

                                <div className="absolute inset-0 bg-black/60"></div>

                                <div className="absolute bottom-10 left-10 right-10">
                                    <h3 className="text-white text-4xl font-black leading-tight">
                                        Không ai nhận ra
                                        <br />
                                        nỗi buồn thầm lặng...
                                    </h3>
                                </div>
                            </div>

                            <div className="p-10 space-y-5">

                                {[
                                    'Chỉ phát hiện té ngã',
                                    'Lưu dữ liệu trên cloud',
                                    'Giao tiếp bị động',
                                    'Không hiểu cảm xúc',
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-4 text-slate-500 text-xl"
                                    >

                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* VS */}
                        <div className="flex justify-center">

                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white flex items-center justify-center text-3xl font-black shadow-2xl">
                                VS
                            </div>
                        </div>

                        {/* NEW */}
                        <div className="rounded-[3rem] bg-[#07111F] overflow-hidden border border-white/5 shadow-[0_10px_80px_rgba(0,0,0,0.35)]">

                            <div className="relative h-[320px]">
                                <img
                                    src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1400&auto=format&fit=crop"
                                    alt=""
                                    className="w-full h-full object-cover"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] to-transparent"></div>

                                <div className="absolute bottom-10 left-10 right-10">
                                    <h3 className="text-white text-4xl font-black leading-tight">
                                        Cho đến khi có EHC
                                        <br />
                                        luôn ở bên.
                                    </h3>
                                </div>
                            </div>

                            <div className="p-10 space-y-5">

                                {[
                                    'Phát hiện cô đơn và trầm cảm',
                                    'Xử lý tại thiết bị với Zero-Cloud',
                                    'Chủ động trò chuyện mỗi ngày',
                                    'AI thấu cảm như người thân',
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-4 text-white text-xl"
                                    >
                                        <CheckCircle2 className="text-emerald-400" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* =========================================================
                FEATURES
            ========================================================== */}
            <section className="pb-28">

                <div className="max-w-[1700px] mx-auto px-6 xl:px-10">

                    <div className="text-center mb-16">

                        <h2 className="text-6xl font-black text-slate-800 tracking-[-0.04em]">
                            Tính năng nổi bật
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-6">

                        {[
                            {
                                icon: Brain,
                                title: 'Nhận diện cảm xúc',
                                desc: 'Phân tích khuôn mặt và giọng nói để đánh giá tâm trạng.',
                            },
                            {
                                icon: AlertTriangle,
                                title: 'Phát hiện té ngã',
                                desc: 'Nhận diện bất thường theo thời gian thực.',
                            },
                            {
                                icon: Heart,
                                title: 'AI thấu cảm',
                                desc: 'Lắng nghe, phản hồi tự nhiên như người thân.',
                            },
                            {
                                icon: Mic,
                                title: 'Giọng nói người thân',
                                desc: 'Voice cloning tạo cảm giác gần gũi.',
                            },
                            {
                                icon: Shield,
                                title: 'Riêng tư tuyệt đối',
                                desc: 'Không lưu hình ảnh sau phân tích.',
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="rounded-[2.5rem] bg-white border border-gray-100 p-8 shadow-[0_10px_60px_rgba(15,23,42,0.06)] hover:-translate-y-2 transition-all duration-300"
                            >
                                <div className="w-20 h-20 rounded-[2rem] bg-[#EDF4FF] flex items-center justify-center">
                                    <item.icon
                                        className="text-blue-600"
                                        size={34}
                                    />
                                </div>

                                <h3 className="mt-8 text-2xl font-black text-slate-800">
                                    {item.title}
                                </h3>

                                <p className="mt-4 text-slate-500 text-lg leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* =========================================================
                FINAL CTA
            ========================================================== */}
            <section className="pb-28">

                <div className="max-w-[1700px] mx-auto px-6 xl:px-10">

                    <div className="rounded-[3rem] bg-[#07111F] overflow-hidden relative">

                        <div className="absolute inset-0">
                            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/20 blur-3xl rounded-full"></div>
                            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-600/20 blur-3xl rounded-full"></div>
                        </div>

                        <div className="relative grid xl:grid-cols-2 gap-10 items-center p-14 xl:p-20">

                            <div>

                                <p className="text-blue-400 uppercase tracking-[0.3em] font-black">
                                    EHC COMPANION
                                </p>

                                <h2 className="mt-6 text-6xl leading-[1] font-black text-white tracking-[-0.05em]">
                                    Công nghệ không chỉ để thông minh hơn.
                                </h2>

                                <h3 className="mt-6 text-4xl leading-tight font-black text-slate-300">
                                    Mà để con người bớt cô đơn hơn.
                                </h3>

                                <div className="flex flex-wrap gap-5 mt-12">

                                    <button className="h-16 px-8 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] transition-all text-white font-black text-lg shadow-[0_20px_60px_rgba(59,130,246,0.35)]">
                                        Tham gia nghiên cứu
                                    </button>

                                    <button className="h-16 px-8 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 transition-all text-white font-black text-lg">
                                        Hợp tác cùng EHC
                                    </button>
                                </div>
                            </div>

                            <div className="relative h-[500px] hidden xl:block">

                                <img
                                    src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1600&auto=format&fit=crop"
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover rounded-[3rem]"
                                />

                                <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-t from-[#07111F] to-transparent"></div>

                                <div className="absolute bottom-10 left-10 right-10 rounded-[2rem] bg-white/10 border border-white/10 backdrop-blur-xl p-6">
                                    <div className="flex items-center justify-between">

                                        <div>
                                            <p className="text-slate-300 uppercase tracking-widest text-xs font-black">
                                                Happiness Score
                                            </p>

                                            <h3 className="text-white text-4xl font-black mt-3">
                                                85/100
                                            </h3>
                                        </div>

                                        <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/20 flex items-center justify-center">
                                            <Heart
                                                className="text-emerald-400"
                                                fill="currentColor"
                                                size={34}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 h-3 bg-white/10 rounded-full overflow-hidden">
                                        <div className="w-[85%] h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;