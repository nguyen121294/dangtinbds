import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { workspaces, workspaceMembers, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { LayoutDashboard, LogOut, CodeSquare, Crown, User, CreditCard } from 'lucide-react';
import CreateWorkspaceModal from '@/components/create-workspace-modal';
import { checkWorkspaceCreationQuota, getUserPlanDetails } from '@/lib/workspace-utils';

export default async function DashboardHub() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch Danh sách các phòng user đang tham gia
  const userMemberships = await db.select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));

  const workspaceListObj = await db.select({
       id: workspaces.id,
       name: workspaces.name,
       ownerId: workspaces.ownerId
  }).from(workspaces);

  const allowedWorkspaces = workspaceListObj
    .filter(ws => userMemberships.some(m => m.workspaceId === ws.id))
    .map(ws => {
       const isOwner = ws.ownerId === user.id;
       return {
         id: ws.id,
         name: ws.name,
         role: isOwner ? 'owner' : 'member'
       };
    });

  // 2. Lấy tình trạng Cá nhân của User (để vẽ thẻ bên trái)
  const profileDetails = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  const dbUser = profileDetails[0];

  const { isVip: isPersonalVip, planName: planInfo } = await getUserPlanDetails(user.id);
  
  // 3. Quota Tạo Phòng
  const quota = await checkWorkspaceCreationQuota(user.id);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* HUB NAVBAR TINH GỌN */}
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <CodeSquare className="w-8 h-8 text-indigo-500" />
            <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              SaaS Hub
            </div>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase ml-2">Cổng trạm</span>
          </div>

          <div className="flex items-center gap-4">
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-zinc-400 hover:text-white transition flex items-center gap-2" title="Đăng xuất">
                 <LogOut className="h-5 w-5" /> Đăng xuất máy chủ
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* HUB MAIN LAYOUT */}
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight mb-8">Trạm Không Gian Làm Việc</h1>
        
        <div className="grid lg:grid-cols-12 gap-8">
           
           {/* Cột trái: Thông tin Cá Nhân */}
           <div className="lg:col-span-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl sticky top-8">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-500/20">
                       {dbUser?.firstName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                       <h2 className="text-xl font-bold">{dbUser?.firstName || 'Hi Khách'} {dbUser?.lastName || ''}</h2>
                       <p className="text-zinc-400 text-sm truncate max-w-[200px]">{user.email}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                       <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Cấp độ Ví</p>
                       <p className={`font-bold flex items-center gap-2 ${isPersonalVip ? 'text-amber-400' : 'text-zinc-300'}`}>
                          {isPersonalVip ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          {planInfo}
                       </p>
                       {!isPersonalVip && (
                          <a href="/pricing" className="mt-3 block text-center w-full bg-zinc-800 hover:bg-zinc-700 text-sm py-2 rounded-xl transition font-medium">
                            <CreditCard className="w-4 h-4 inline-block mr-1" /> Nâng Cấp Ngay
                          </a>
                       )}
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                       <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Thống kê</p>
                       <p className="text-sm">Bạn đang có mặt trong <b>{allowedWorkspaces.length}</b> phòng làm việc.</p>
                       <p className="text-sm mt-1">Hạn ngạch tạo phòng: <b>{quota.used}/{quota.total}</b></p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Cột phải: Danh sách Workspace */}
           <div className="lg:col-span-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl min-h-[500px]">
                 <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                    Bàn Làm Việc Của Bạn
                 </h2>
                 
                 <div className="grid sm:grid-cols-2 gap-4">
                    {/* Các phòng hiện tại */}
                    {allowedWorkspaces.map(ws => (
                       <a 
                          key={ws.id} 
                          href={`/${ws.id}/dashboard`}
                          className="group p-5 border border-zinc-700 rounded-2xl bg-zinc-950 hover:bg-zinc-800/50 hover:border-indigo-500/50 transition cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[160px]"
                       >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl group-hover:bg-indigo-500/10 transition"></div>
                          <div className="relative z-10 w-full">
                             <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">{ws.name}</h3>
                             <div className="mt-2 inline-block">
                                {ws.role === 'owner' ? (
                                   <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-full uppercase font-bold tracking-wider flex items-center gap-1 w-max">
                                      <Crown className="w-3 h-3" /> Chủ Sở Hữu
                                   </span>
                                ) : (
                                   <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-1 rounded-full uppercase font-bold tracking-wider block w-max">
                                      Thành viên
                                   </span>
                                )}
                             </div>
                          </div>
                          
                          <div className="relative z-10 text-right mt-4">
                             <span className="text-sm text-indigo-400 opacity-0 group-hover:opacity-100 transition translate-x-4 group-hover:translate-x-0 inline-block font-semibold">
                                Vào phòng &rarr;
                             </span>
                          </div>
                       </a>
                    ))}

                    {/* Nút Tạo Phòng Mới (Tích hợp Client Modal) */}
                    {/* Chú ý: Modal được viết ở dạng Component nên chỉ nhét nó vào đây thôi */}
                    {/* <CreateWorkspaceModal canCreate={quota.canCreate} used={quota.used} total={quota.total} /> */}
                    
                    <CreateWorkspaceModal canCreate={quota.canCreate} used={quota.used} total={quota.total} />
                    
                 </div>

                 {allowedWorkspaces.length === 0 && (
                    <div className="mt-12 text-center text-zinc-500 flex flex-col items-center">
                       <LayoutDashboard className="w-16 h-16 opacity-20 mb-4" />
                       <p>Không gian làm việc của bạn đang trống.</p>
                       <p className="text-sm mt-1">Bấm nút "Tạo Workspace mới" thả ga khám phá nhé!</p>
                    </div>
                 )}
              </div>
           </div>

        </div>
      </main>
    </div>
  );
}
