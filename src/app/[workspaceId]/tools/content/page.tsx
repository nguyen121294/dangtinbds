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
     <main className="max-w-[1000px] w-full mx-auto p-4 sm:p-8 flex-1">
        <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden p-6 mt-4">
           <div className="mb-6 border-b border-gray-200 pb-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Trợ lý Viết Bài Đăng AI</h1>
              <p className="text-sm text-gray-500">Tự động cấu trúc chuẩn SEO. Bản nháp tự động lưu vào Google Drive của bạn.</p>
           </div>
           
           {/* Lưu ý: Nếu env NEXT_PUBLIC_GOOGLE_CLIENT_ID bị thiếu, Component này ở client có thể ném Exception */}
           <PropertyForm />
        </div>
     </main>
  );
}
