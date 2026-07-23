import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <header className="bg-white px-4 py-3 shadow-sm flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-800">汇信电力</h1>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  const isSite = user.role === 'site';
  const isViewer = user.role === 'viewer';

  // 现场人员：只看到“维保项目”一个标签
  if (isSite) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <header className="bg-white px-4 py-3 shadow-sm flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-800">汇信电力</h1>
          <button onClick={handleLogout} className="text-sm text-gray-500">退出</button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <nav className="bg-white border-t border-gray-200 flex justify-around py-2">
          <Link
            to="/mobile/site/projects"
            className={`flex flex-col items-center py-1 px-3 ${
              location.pathname.startsWith('/mobile/site') ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">🔧</span>
            <span className="text-xs">维保项目</span>
          </Link>
        </nav>
      </div>
    );
  }

  // 其他角色：完整菜单
  const menuItems = [
    { path: '/mobile-home', icon: '🏠', label: '首页' },
    { path: '/mobile/project-search', icon: '🏗️', label: '项目' },
    { path: '/mobile/purchase-search', icon: '🛒', label: '采购' },
    { path: '/mobile/supplier-search', icon: '🏭', label: '供应商' },
    { path: '/mobile/transaction-search', icon: '💰', label: '收付款' },
  ];

  if (!isViewer) {
    menuItems.push({ path: '/mobile/site/projects', icon: '🔧', label: '维保' });
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white px-4 py-3 shadow-sm flex justify-between items-center">
        <h1 className="text-lg font-bold text-gray-800">汇信电力</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500">退出</button>
      </header>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <nav className="bg-white border-t border-gray-200 flex justify-around py-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center py-1 px-3 ${
              location.pathname === item.path ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}