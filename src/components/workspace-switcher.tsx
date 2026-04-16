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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition"
      >
        <span className="truncate max-w-[150px]">{currentWorkspace?.name || 'Chọn Workspace'}</span>
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl z-50 overflow-hidden">
          <div className="p-2">
            <h4 className="px-2 text-xs font-semibold text-zinc-500 mb-2 uppercase">Workspaces của bạn</h4>
            <div className="space-y-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSelect(ws.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                    ws.id === currentWorkspaceId
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.role === 'owner' && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded ml-2 uppercase">Chủ</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-zinc-800 p-2">
             <button disabled className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-not-allowed opacity-50">
               <PlusCircle className="h-4 w-4" />
               <span>Tạo Workspace mới (Sắp có)</span>
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
