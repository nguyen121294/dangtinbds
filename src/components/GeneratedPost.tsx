"use client";
import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

export default function GeneratedPost({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl p-8 bg-gray-50/50">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5L18.5 7H20M9 11l3 3L22 4" />
          </svg>
        </div>
        <p className="text-center">Kết quả bài đăng sẽ hiện tại đây...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm sticky top-0">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <span className="text-xl">✨</span> Bài đăng đã sẵn sàng
        </h2>
        <button onClick={handleCopy} className="flex items-center space-x-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 font-medium text-gray-700 px-4 py-2 rounded-xl transition shadow-sm">
          {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
          <span>{copied ? "Đã copy!" : "Copy nội dung"}</span>
        </button>
      </div>
      <div className="p-6 flex-1 overflow-y-auto w-full leading-relaxed text-gray-800">
        <div className="whitespace-pre-wrap font-sans">{content}</div>
      </div>
    </div>
  );
}
