import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import { backupAllData } from '../utils/backup';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: '📊', roles: ['admin', 'finance', 'boss', 'viewer'] },
  { path: '/projects', label: '项目管理', icon: '🏗️', roles: ['admin', 'finance', 'boss', 'viewer'] },
  { path: '/suppliers', label: '供应商管理', icon: '🏭', roles: ['admin', 'finance', 'boss', 'viewer'] },
  { path: '/purchases', label: '采购管理', icon: '🛒', roles: ['admin', 'finance', 'boss', 'viewer'] },
  { path: '/transactions', label: '收付款管理', icon: '💰', roles: ['admin', 'finance', 'boss', 'viewer'] },
  { path: '/invoices', label: '发票管理', icon: '📄', roles: ['admin', 'finance', 'boss', 'viewer'] },
  { path: '/users', label: '账号管理', icon: '👥', roles: ['admin'] },
  { path: '/logs', label: '操作日志', icon: '📋', roles: ['admin'] },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleBackup = async () => {
    const result = await backupAllData();
    alert(result.message);
  };

  const handleExport = async (module: string) => {
    setExporting(true);
    try {
      const result = await api.export.exportData(module);
      alert(result.message);
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
    viewer: '浏览人',
  }[user?.role || 'viewer'];

  const visibleNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || 'viewer')
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <aside className="w-64 bg-gradient-to-b from-blue-800 to-blue-900 shadow-xl">
        {/* Logo 区域 */}
        <div className="p-5 border-b border-blue-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-300 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">⚡</span>
            </div>
            <div>
              <h1 className="text-white text-lg font-bold tracking-wide">汇信电力</h1>
              <p className="text-blue-300 text-xs">财务管理系统（菜菜测试1.1）</p>
            </div>
          </div>
        </div>
        
        {/* 导航菜单 */}
        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-700 text-white shadow-md' 
                    : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1 h-6 bg-white rounded-full"></div>
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* 底部用户信息 */}
        <div className="absolute bottom-0 w-64 p-4 border-t border-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">👤</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{user?.name}</p>
              <p className="text-blue-300 text-xs">{roleName}</p>
            </div>
          </div>
        </div>
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
            {user?.role === 'admin' && (
              <button
                onClick={handleBackup}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>💾</span>
                备份数据
              </button>
            )}
            
            {(user?.role === 'admin' || user?.role === 'finance') && (
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
            )}
            
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
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}