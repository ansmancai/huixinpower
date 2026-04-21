import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function MobileLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* 顶部栏 */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">汇信电力</h1>
            <p className="text-xs text-blue-200">{user?.name}</p>
          </div>
          <button onClick={handleLogout} className="text-sm bg-blue-700 px-3 py-1 rounded">
            退出
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <main className="p-4">
        <Outlet />
      </main>

      {/* 底部导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2">
        <Link to="/mobile-home" className="flex flex-col items-center py-1 text-gray-600">
          <span className="text-xl">🏠</span>
          <span className="text-xs">首页</span>
        </Link>
        <Link to="/mobile/purchase-search" className="flex flex-col items-center py-1 text-gray-600">
          <span className="text-xl">🛒</span>
          <span className="text-xs">采购</span>
        </Link>
        <Link to="/mobile/project-search" className="flex flex-col items-center py-1 text-gray-600">
          <span className="text-xl">📋</span>
          <span className="text-xs">项目</span>
        </Link>
        <Link to="/mobile/supplier-search" className="flex flex-col items-center py-1 text-gray-600">
          <span className="text-xl">🏭</span>
          <span className="text-xs">供应商</span>
        </Link>
        <Link to="/mobile/transaction-search" className="flex flex-col items-center py-1 text-gray-600">
          <span className="text-xl">💰</span>
          <span className="text-xs">收付款</span>
        </Link>
      </div>
    </div>
  );
}