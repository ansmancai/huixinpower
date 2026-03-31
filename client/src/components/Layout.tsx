import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import { backupAllData } from '../utils/backup';
import { useState, useEffect } from 'react';
import VantaBackground from './VantaBackground';

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
  <>
    <VantaBackground />
    <div className="flex h-screen">
      {/* 原有的侧边栏和内容区保持不变 */}
    </div>
  </>
);

    <div className="flex h-screen">
      {/* 背景渐变 */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 -z-10" />
      
      {/* 侧边栏 - 毛玻璃效果 */}
      <aside className="w-64 backdrop-blur-xl bg-white/10 border-r border-white/20 shadow-xl">
        <div className="p-5 border-b border-white/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">⚡</span>
            </div>
            <div>
              <h1 className="text-white text-lg font-semibold tracking-wide">汇信电力</h1>
              <p className="text-white/60 text-xs">财务管理系统</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-white/20 text-white shadow-md' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1 h-5 bg-white rounded-full shadow-sm"></div>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 w-64 p-4 border-t border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-white text-sm">👤</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{user?.name}</p>
              <p className="text-white/60 text-xs">{roleName}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="backdrop-blur-md bg-white/5 border-b border-white/10 px-6 py-3 flex justify-between items-center">
          <div className="text-white/80 text-sm">
            欢迎回来，<span className="font-semibold text-white">{user?.name}</span>
            <span className="ml-2 text-white/50">({roleName})</span>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <button
                onClick={handleBackup}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                <span>💾</span>
                备份
              </button>
            )}
            
            {(user?.role === 'admin' || user?.role === 'finance') && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  <span>📤</span>
                  {exporting ? '导出中...' : '导出'}
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-xl z-10">
                    {['projects', 'suppliers', 'purchases', 'transactions', 'invoices'].map((type) => (
                      <button
                        key={type}
                        onClick={() => handleExport(type)}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 rounded-lg"
                      >
                        {type === 'projects' && '项目'}
                        {type === 'suppliers' && '供应商'}
                        {type === 'purchases' && '采购单'}
                        {type === 'transactions' && '收付款'}
                        {type === 'invoices' && '发票'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span>🚪</span>
              退出
            </button>
          </div>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}