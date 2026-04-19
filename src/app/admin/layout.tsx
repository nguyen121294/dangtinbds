import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifyAdminSession, removeAdminSession } from '@/lib/admin-auth';
import { LayoutDashboard, Users, CreditCard, LogOut, ExternalLink, Folders, Settings } from 'lucide-react';
import LogoutAdminButton from './logout-button';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await verifyAdminSession();

  if (!isAuthenticated) {
    redirect(`/login-admin`);
  }

  async function handleLogout() {
    'use server';
    await removeAdminSession();
    redirect(`/login-admin`);
  }

  const navItems = [
    { label: 'Dashboard', href: `/admin/dashboard`, icon: LayoutDashboard },
    { label: 'Người dùng', href: `/admin/users`, icon: Users },
    { label: 'Gói dịch vụ', href: `/admin/plans`, icon: CreditCard },
    { label: 'Không gian (Rooms)', href: `/admin/workspaces`, icon: Folders },
    { label: 'Cài đặt Hệ thống', href: `/admin/settings`, icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2F4F5] text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E03C31] flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-gray-900">Admin CMS</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:text-[#E03C31] hover:bg-red-50 transition font-medium group"
            >
              <item.icon className="w-5 h-5 group-hover:text-[#E03C31] transition" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto space-y-2 border-t border-gray-200 bg-gray-50/50">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:text-[#E03C31] hover:bg-white border border-transparent hover:border-red-100 transition font-medium shadow-sm transition-all"
          >
            <ExternalLink className="w-5 h-5" />
            <span>Xem Website</span>
          </Link>
          <LogoutAdminButton action={handleLogout} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
