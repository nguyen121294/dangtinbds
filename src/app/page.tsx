"use client";
import { useState } from "react";
import PropertyForm from "@/components/PropertyForm";
import GeneratedPost from "@/components/GeneratedPost";

export default function Home() {
  const [generatedText, setGeneratedText] = useState("");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 pb-12 font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-500 text-white pt-10 pb-20 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-6xl mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="inline-flex items-center justify-center space-x-2 bg-white/20 backdrop-blur text-white px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-100 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span>Trợ lý AI Bất Động Sản</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Viết Bài Đăng Chốt Sale <br className="hidden md:block" /> <span className="text-blue-100">Trong Vài Giây</span> 🪄
          </h1>
          <p className="text-blue-100/90 md:text-lg max-w-2xl mx-auto font-medium">
            Hãy miêu tả bất động sản của bạn. Gemini AI sẽ ứng dụng nghệ thuật ngôn từ thôi miên để xây dựng kịch bản bài viết hoàn hảo nhất.
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 w-full">
             <PropertyForm onGenerate={(content) => setGeneratedText(content)} />
          </div>
          <div className="lg:col-span-7 w-full lg:sticky lg:top-6 h-auto lg:h-[calc(100vh-3rem)]">
             <GeneratedPost content={generatedText} />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm mt-12 py-6 border-t border-gray-100">
        Powered by Next.js & Google Gemini AI.
      </footer>
    </div>
  );
}
