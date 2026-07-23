import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function MobileHome() {
  const { user } = useAuthStore();

  const roleNameMap: Record<string, string> = {
    admin: '管理员',
    finance: '财务',
    boss: '老板',
    viewer: '浏览人',
    site: '现场人员',
  };

  // 根据角色决定显示哪些入口
  const isSite = user?.role === 'site';
  const isViewer = user?.role === 'viewer';

  // 现场人员只看到维保入口
  if (isSite) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="p-4 bg-white shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">汇信电力</h1>
          <p className="text-sm text-gray-500">{user?.name}（{roleNameMap[user?.role || ''] || user?.role}）</p>
        </div>
        <div className="flex-1 p-4">
          <Link
            to="/mobile/site/projects"
            className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔧</span>
              <div>
                <p className="font-medium text-gray-800">维保项目</p>
                <p className="text-sm text-gray-400">查看和记录巡检</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // 其他角色显示完整入口（viewer 不显示维保）
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">汇信电力</h1>
        <p className="text-sm text-gray-500">{user?.name}（{roleNameMap[user?.role || ''] || user?.role}）</p>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <Link
          to="/mobile/project-search"
          className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏗️</span>
            <div>
              <p className="font-medium text-gray-800">项目</p>
              <p className="text-sm text-gray-400">搜索和查看项目</p>
            </div>
          </div>
        </Link>
        <Link
          to="/mobile/purchase-search"
          className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛒</span>
            <div>
              <p className="font-medium text-gray-800">采购</p>
              <p className="text-sm text-gray-400">搜索和查看采购</p>
            </div>
          </div>
        </Link>
        <Link
          to="/mobile/supplier-search"
          className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏭</span>
            <div>
              <p className="font-medium text-gray-800">供应商</p>
              <p className="text-sm text-gray-400">搜索和查看供应商</p>
            </div>
          </div>
        </Link>
        <Link
          to="/mobile/transaction-search"
          className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-medium text-gray-800">收付款</p>
              <p className="text-sm text-gray-400">搜索和查看收付款</p>
            </div>
          </div>
        </Link>
        {!isViewer && (
          <Link
            to="/mobile/site/projects"
            className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔧</span>
              <div>
                <p className="font-medium text-gray-800">维保项目</p>
                <p className="text-sm text-gray-400">查看和记录巡检</p>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}