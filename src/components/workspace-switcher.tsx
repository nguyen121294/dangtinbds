'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, PlusCircle } from 'lucide-react';

type WorkspaceInfo = {
  id: string;
  name: string;
  role: string;
};

export default function WorkspaceSwitcher({
  currentWorkspaceId,
  workspaces,
}: {
  currentWorkspaceId: string;
  workspaces: WorkspaceInfo[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

  const handleSelect = (id: string) => {
    setIsOpen(false);
    if (id !== currentWorkspaceId) {
      router.push(`/${id}/dashboard`);
    }
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full gap-2 rounded-sm bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-900 border border-gray-200 hover:bg-gray-200 transition-colors"
      >
        <span className="truncate">{currentWorkspace?.name || 'Chọn Workspace'}</span>
        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-56 rounded-sm border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          <div className="p-2">
            <h4 className="px-2 pt-1 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Workspaces của bạn</h4>
            <div className="space-y-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSelect(ws.id)}
                  className={`w-full flex items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors ${
                    ws.id === currentWorkspaceId
                      ? 'bg-[#E03C31]/10 text-[#E03C31] font-bold'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.role === 'owner' && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-sm ml-2 uppercase font-semibold">Chủ</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-200 p-2 bg-gray-50">
             <button disabled className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-not-allowed opacity-50">
               <PlusCircle className="h-4 w-4" />
               <span>Tạo Workspace mới (Sắp có)</span>
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
