import PosterForm from '@/components/PosterForm';

export default async function PosterPage({
  params,
}: {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}) {
  const resolvedParams = await params;
  return (
    <div className="w-full">
      <main className="max-w-[800px] mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🎨 Poster AI Bất Động Sản</h1>
          <p className="text-gray-500 text-sm mt-1">Tạo poster quảng cáo BĐS chuyên nghiệp bằng AI từ dữ liệu và ảnh thật của bạn.</p>
        </div>
        <PosterForm workspaceId={resolvedParams.workspaceId} />
      </main>
    </div>
  );
}
