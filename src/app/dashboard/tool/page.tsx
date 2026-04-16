"use client";
import { useState } from "react";
import PropertyForm from "@/components/PropertyForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 pb-12 font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-500 text-white pt-10 pb-20 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="inline-flex items-center justify-center space-x-2 bg-white/20 backdrop-blur text-white px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-100 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span>Trợ lý AI Bất Động Sản (Tự Động Lưu Drive)</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Bấm 1 Lần, Cất Chìa Khoá Chạy!<br className="hidden md:block" />
          </h1>
          <p className="text-blue-100/90 md:text-lg max-w-2xl mx-auto font-medium">
            Hệ thống sẽ chạy ngầm và tự động xếp bài viết thẳng vào thư mục Google Drive của bạn sau 10s. Bạn không cần ngồi màn hình chờ đợi nữa.
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 md:px-6 -mt-10 relative z-20">
         <PropertyForm onGenerate={(content) => {}} />
      </main>
      
      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm mt-12 py-6 border-t border-gray-100">
        Powered by Next.js, Upstash QStash & Google Gemini AI.
      </footer>
    </div>
  );
}
