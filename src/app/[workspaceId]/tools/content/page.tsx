import PropertyForm from '@/components/PropertyForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ContentToolPage({
  params,
}: {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  return (
    <div className="min-h-screen bg-[#F2F4F5] text-gray-900 font-sans">
       <nav className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
          <Link href={`/${workspaceId}/dashboard`} className="text-gray-500 hover:text-[#E03C31] flex items-center gap-1 text-sm font-medium transition-colors">
             <ArrowLeft className="w-4 h-4" />
             Về bảng quản lý Công cụ
          </Link>
       </nav>

       <main className="max-w-[1000px] mx-auto p-4 sm:p-8">
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden p-6">
             <div className="mb-6 border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Trợ lý Viết Bài Đăng AI</h1>
                <p className="text-sm text-gray-500">Tự động cấu trúc chuẩn SEO. Bản nháp tự động lưu vào Google Drive của bạn.</p>
             </div>
             
             {/* Lưu ý: Nếu env NEXT_PUBLIC_GOOGLE_CLIENT_ID bị thiếu, Component này ở client có thể ném Exception */}
             <PropertyForm />
          </div>
       </main>
    </div>
  );
}
