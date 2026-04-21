import { Link } from 'react-router-dom';

export default function MobileHome() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow p-6 mb-4">
        <h1 className="text-2xl font-bold text-center">汇信电力</h1>
        <p className="text-center text-gray-500 text-sm mt-1">移动快捷查询</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/mobile/purchase-search" className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition">
          <div className="text-4xl mb-2">🛒</div>
          <div className="font-medium">采购查询</div>
          <div className="text-xs text-gray-400 mt-1">按项目/供应商</div>
        </Link>
        
        <div className="bg-white rounded-xl shadow p-6 text-center opacity-50">
          <div className="text-4xl mb-2">📋</div>
          <div className="font-medium">项目查询</div>
          <div className="text-xs text-gray-400 mt-1">即将推出</div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6 text-center opacity-50">
          <div className="text-4xl mb-2">🏭</div>
          <div className="font-medium">供应商查询</div>
          <div className="text-xs text-gray-400 mt-1">即将推出</div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6 text-center opacity-50">
          <div className="text-4xl mb-2">💰</div>
          <div className="font-medium">收付款查询</div>
          <div className="text-xs text-gray-400 mt-1">即将推出</div>
        </div>
      </div>
      
      <div className="mt-6 text-center text-xs text-gray-400">
        电脑版请访问 ft.gdhxpower.com
      </div>
    </div>
  );
}