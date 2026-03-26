import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

import Home from './pages/Home';
import Diary from './pages/Diary';
import Family from './pages/Family';
import Challenge from './pages/Challenge';
import Vision from './pages/Vision';
import LoginPage from './pages/Loginpage'; // Kiểm tra lại tên file chính xác (P hay p)

// Tạo một Layout component để bọc các trang nội bộ, tránh lồng Routes
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-screen bg-white text-elderly-text font-inter">
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <Header title="Nhà Cửa Thông Minh Cảm Xúc" />
      <main className="flex-grow p-6 bg-[#F8FAFC]">
        {children}
      </main>
      <Footer />
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<MainLayout><Home /></MainLayout>} />
        <Route path="/Diary" element={<MainLayout><Diary /></MainLayout>} />
        <Route path="/Family" element={<MainLayout><Family /></MainLayout>} />
        <Route path="/Challenge" element={<MainLayout><Challenge /></MainLayout>} />
        <Route path="/Vision" element={<MainLayout><Vision /></MainLayout>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;