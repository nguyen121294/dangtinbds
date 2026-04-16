import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { profiles, workspaces, workspaceMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { XCircle, AlertTriangle, RefreshCcw, LogOut } from 'lucide-react';
import { reactivateAccount } from '@/app/dashboard/account/actions';
import WorkspaceSwitcher from '@/components/workspace-switcher';
import { checkWorkspaceAccess } from '@/lib/workspace-utils';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let dbUser = null;
  try {
    const results = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
    dbUser = results[0];
  } catch (error) {
    console.error('Layout DB Query Error:', error);
  }

  // 1. Phân quyền
  if (dbUser?.status === 'locked') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Tài khoản bị khóa</h1>
          <p className="text-zinc-400 mb-6">Tài khoản của bạn đã bị khóa.</p>
          <form action="/auth/signout" method="post"><button type="submit" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition">Đăng xuất</button></form>
        </div>
      </div>
    );
  }

  if (dbUser?.status === 'inactive') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        {/* code bị ẩn đi để gọn */}
      </div>
    );
  }

  // Lấy thông tin về các Workspaces của User để hiển thị Dropdown
  const userMemberships = await db.select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));

  // Lấy chi tiết Workspaces đó (để có Tên)
  const workspaceListObj = await db.select({
      id: workspaces.id,
      name: workspaces.name
  })
    .from(workspaces); // (Trong môi trường production nên inner join để tránh select all, tôi query đơn giản tạm)

  const allowedWorkspaces = workspaceListObj
    .filter(ws => userMemberships.some(m => m.workspaceId === ws.id))
    .map(ws => {
       const membership = userMemberships.find(m => m.workspaceId === ws.id);
       return {
         id: ws.id,
         name: ws.name,
         role: membership?.role || 'member'
       };
    });

  // Verify access to the current active workspace
  const hasAccess = allowedWorkspaces.some(w => w.id === workspaceId);
  if (!hasAccess && allowedWorkspaces.length > 0) {
    redirect(`/${allowedWorkspaces[0].id}/dashboard`);
  } else if (!hasAccess && allowedWorkspaces.length === 0) {
    redirect('/auth/callback'); // fix
  }

  // Kiểm tra cái workspace hiện tại có VIP không
  const isVipWorkspace = await checkWorkspaceAccess(workspaceId);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              SaaS Starter
            </Link>
            
            {/* WORKSPACE SWITCHER HERE */}
            <WorkspaceSwitcher 
              currentWorkspaceId={workspaceId} 
              workspaces={allowedWorkspaces} 
            />
            {isVipWorkspace && (
              <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full uppercase font-bold tracking-wider shadow-amber-500/20 shadow-[0_0_15px]">PRO WORKSPACE</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{user.email}</span>
            <Link href="/dashboard/account" className="text-sm font-medium text-zinc-300 hover:text-white transition">
              Cài đặt Cá nhân
            </Link>
            <Link href={`/${workspaceId}/dashboard/workspace-settings`} className="text-sm font-medium text-blue-400 hover:text-white transition">
              Quản lý Team
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-zinc-400 hover:text-white transition" title="Đăng xuất">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </nav>
      {/* Container chung để children kế thừa Navbar, DashboardPage giờ chỉ cần render phần thân */}
      <main className="flex-1 mx-auto max-w-4xl px-4 py-12 w-full">
        {children}
      </main>
    </div>
  );
}
