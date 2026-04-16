'use client';

import { useState, useTransition } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LogoutAdminButton({ action }: { action: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      onClick={() => {
        setIsLoading(true);
        startTransition(async () => {
          await action();
        });
      }}
      disabled={isPending || isLoading}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition disabled:opacity-50"
    >
      {isPending || isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
      <span>{isPending || isLoading ? 'Đang thoát...' : 'Đăng xuất'}</span>
    </button>
  );
}
