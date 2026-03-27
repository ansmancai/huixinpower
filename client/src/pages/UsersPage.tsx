import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';

export default function UsersPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'viewer',
    password: '',
  });

  const canEdit = user?.role === 'admin';

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('加载用户失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    
    try {
      if (editingUser) {
        // 编辑用户
        const updateData: any = {
          name: formData.name,
          role: formData.role,
        };
        // 如果填写了新密码，则更新密码
        if (formData.password) {
          updateData.password_hash = formData.password;
        }
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);
        if (error) throw error;
      } else {
        // 新建用户
        const { error } = await supabase
          .from('users')
          .insert([{
            id: crypto.randomUUID(),
            email: formData.email,
            name: formData.name,
            role: formData.role,
            password_hash: formData.password || '123456',
            created_at: new Date().toISOString(),
          }]);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ email: '', name: '', role: 'viewer', password: '' });
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除用户 "${name}" 吗？`)) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const roleMap: Record<string, string> = {
    admin: '管理员',
    finance: '财务',
    boss: '老板',
    viewer: '浏览人',
  };

  if (!canEdit) {
    return <div className="text-center py-12 text-red-500">无权限访问</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">账号管理</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ email: '', name: '', role: 'viewer', password: '' });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 新建账号
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">邮箱</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">姓名</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">角色</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{u.email}</td>
                <td className="px-6 py-4 text-sm">{u.name}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    u.role === 'admin' ? 'bg-red-100 text-red-800' :
                    u.role === 'finance' ? 'bg-blue-100 text-blue-800' :
                    u.role === 'boss' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {roleMap[u.role] || u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setFormData({
                          email: u.email,
                          name: u.name,
                          role: u.role,
                          password: '',
                        });
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      编辑
                    </button>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">暂无用户数据</div>
        )}
      </div>

      {/* 新建/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingUser ? '编辑账号' : '新建账号'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">邮箱 *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">姓名 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="admin">管理员</option>
                  <option value="finance">财务</option>
                  <option value="boss">老板</option>
                  <option value="viewer">浏览人</option>
                </select>
              </div>
              {editingUser ? (
                <div>
                  <label className="block text-sm font-medium mb-1">新密码（留空则不修改）</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="留空则不修改密码"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">密码</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="留空则默认 123456"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}