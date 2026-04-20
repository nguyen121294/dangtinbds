import PropertyFormV2 from '@/components/PropertyFormV2';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ContentToolV2Page({
  params,
}: {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  return (
     <main className="max-w-[1000px] w-full mx-auto p-4 sm:p-8 flex-1">
        <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden p-6 mt-4">
           <div className="mb-6 border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-1">
                 <h1 className="text-2xl font-bold text-gray-900">Trợ lý Viết Bài Đăng AI</h1>
                 <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-sm uppercase tracking-wider">V2</span>
              </div>
              <p className="text-sm text-gray-500">Chỉ cần nhập thông tin → AI tự viết bài dài + tóm tắt ngắn. Lưu ẩn vào Drive.</p>
           </div>
           
           <PropertyFormV2 workspaceId={workspaceId} />
        </div>
     </main>
  );
}
