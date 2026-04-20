import ImageEditorForm from '@/components/ImageEditorForm';

export default async function ImageEditorPage({
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
                 <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa Ảnh AI</h1>
                 <span className="text-[10px] font-bold bg-orange-600 text-white px-2 py-0.5 rounded-sm uppercase tracking-wider">AI</span>
              </div>
              <p className="text-sm text-gray-500">Xóa vật thể, làm nét ảnh BĐS bằng AI. Tự lưu kết quả vào Drive.</p>
           </div>
           
           <ImageEditorForm workspaceId={workspaceId} />
        </div>
     </main>
  );
}
