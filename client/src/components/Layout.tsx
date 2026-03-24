import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: '📊' },
  { path: '/projects', label: '项目管理', icon: '🏗️' },
  { path: '/suppliers', label: '供应商管理', icon: '🏭' },
  { path: '/purchases', label: '采购管理', icon: '🛒' },
  { path: '/transactions', label: '收付款管理', icon: '💰' },
  { path: '/invoices', label: '发票管理', icon: '📄' },
  
];

export default function Layout() {
  const navigate = useNavigate();
  const { user, token, logout, updateUser } = useAuthStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (token && !user) {
      api.auth.getProfile().then((data) => {
        updateUser(data);
      }).catch(() => {
        logout();
        navigate('/login');
      });
    }
  }, [token, user, updateUser, logout, navigate]);

  const handleExport = async (dataType: string) => {
    setExporting(true);
    try {
      const result = await api.export.toFeishu(dataType);
      alert(`导出成功：${result.message || `已导出 ${result.count} 条数据`}`);
    } catch (error: any) {
      alert(`导出失败：${error.message}`);
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleName = {
    admin: '管理员',
    finance: '财务',
    boss: '老板',
    viewer: '查看者',
  }[user?.role || 'viewer'];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-blue-600">电力财务系统</h1>
        </div>
        <nav className="p-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <div className="text-gray-600">
            欢迎回来，<span className="font-semibold">{user?.name}</span>
            <span className="ml-2 text-sm text-gray-400">({roleName})</span>
          </div>
          <div className="flex items-center gap-4">
            {/* 导出按钮 */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <span>📤</span>
                {exporting ? '导出中...' : '导出到飞书'}
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                  {['projects', 'suppliers', 'purchases', 'transactions', 'invoices'].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleExport(type)}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      {type === 'projects' && '导出项目'}
                      {type === 'suppliers' && '导出供应商'}
                      {type === 'purchases' && '导出采购单'}
                      {type === 'transactions' && '导出收付款'}
                      {type === 'invoices' && '导出发票'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span>🚪</span>
              退出登录
            </button>
          </div>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}