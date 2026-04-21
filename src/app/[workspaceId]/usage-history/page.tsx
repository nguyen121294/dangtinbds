import UsageLogTable from '@/components/UsageLogTable';
import { ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';

export default async function UsageHistoryPage({
  params,
}: {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  return (
    <div className="w-full">
      <main className="max-w-[1000px] mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href={`/${workspaceId}/dashboard`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-4">
            <ArrowLeft className="w-4 h-4" />
            Quay lại Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 flex items-center justify-center rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Lịch sử sử dụng</h1>
              <p className="text-sm text-gray-500">Theo dõi credit và trạng thái xử lý các yêu cầu AI.</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <UsageLogTable workspaceId={workspaceId} />
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Lịch sử được lưu trữ tối đa 30 ngày. Credit chỉ bị trừ khi xử lý thành công.
        </p>
      </main>
    </div>
  );
}
