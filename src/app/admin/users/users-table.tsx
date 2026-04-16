'use client';

import { useState } from 'react';
import { Search, Edit2, Trash2, Calendar, Mail, User as UserIcon, X, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Plan } from '@/lib/plans';

type UserProfile = {
  id: string;
  email: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionExpiresAt: Date | null;
  status: string | null;
  createdAt: Date | null;
};

export default function UsersTable({ initialUsers, plans }: { initialUsers: any[], plans: Plan[] }) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers.map(u => ({
    ...u,
    subscriptionExpiresAt: u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt) : null,
    createdAt: u.createdAt ? new Date(u.createdAt) : null
  })));
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);

    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          subscriptionId: editingUser.subscriptionId,
          subscriptionStatus: editingUser.subscriptionStatus,
          subscriptionExpiresAt: editingUser.subscriptionExpiresAt?.toISOString() || null,
          status: editingUser.status,
        }),
      });

      if (res.ok) {
        setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
        setEditingUser(null);
      } else {
        alert('Cập nhật thất bại');
      }
    } catch (err) {
      alert('Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    setIsDeleting(id);

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        alert('Xóa thất bại');
      }
    } catch (err) {
      alert('Đã xảy ra lỗi');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          placeholder="Tìm kiếm người dùng theo email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-800">
                <th className="px-6 py-4">Người dùng</th>
                <th className="px-6 py-4">Gói dịch vụ</th>
                <th className="px-6 py-4">Subscription</th>
                <th className="px-6 py-4">Tài khoản</th>
                <th className="px-6 py-4">Ngày hết hạn</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-800/30 transition group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{user.email}</div>
                        <div className="text-xs text-zinc-500">ID: {user.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-300">
                    {user.subscriptionId ? (
                      <span className="capitalize">{user.subscriptionId}</span>
                    ) : (
                      <span className="text-zinc-500">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.subscriptionStatus === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                    }`}>
                      {user.subscriptionStatus === 'active' ? 'Hoạt động' : 'Hết hạn'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'locked' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {user.status === 'locked' ? 'Bị khóa' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-300">
                    {user.subscriptionExpiresAt ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        {format(user.subscriptionExpiresAt, 'dd/MM/yyyy')}
                      </div>
                    ) : (
                      <span className="text-zinc-500">Vô hạn</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setEditingUser(user)}
                        className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={isDeleting === user.id}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition"
                      >
                        {isDeleting === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 italic">
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h3 className="text-xl font-bold">Chỉnh sửa người dùng</h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-500 opacity-70">
                    {editingUser.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Gói dịch vụ</label>
                  <select 
                    value={editingUser.subscriptionId || ''}
                    onChange={(e) => {
                      const newId = e.target.value;
                      if (newId === 'free' || newId === '') {
                        setEditingUser({
                          ...editingUser, 
                          subscriptionId: newId, 
                          subscriptionStatus: 'inactive',
                          subscriptionExpiresAt: null 
                        });
                      } else {
                        setEditingUser({
                          ...editingUser, 
                          subscriptionId: newId,
                          subscriptionStatus: 'active'
                        });
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="">N/A</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Trạng thái Subscription</label>
                  <select 
                    value={editingUser.subscriptionStatus || 'inactive'}
                    onChange={(e) => setEditingUser({...editingUser, subscriptionStatus: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Hết hạn</option>
                    <option value="past_due">Quá hạn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Trạng thái Tài khoản</label>
                  <select 
                    value={editingUser.status || 'active'}
                    onChange={(e) => setEditingUser({...editingUser, status: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="locked">Bị khóa</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Ngày hết hạn</label>
                  <input 
                    type="date"
                    value={editingUser.subscriptionExpiresAt ? format(editingUser.subscriptionExpiresAt, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser, 
                      subscriptionExpiresAt: e.target.value ? new Date(e.target.value) : null
                    })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
