import { Link } from 'react-router-dom';

export default function MobileHome() {
  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-4">
      {/* 头部卡片 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 mb-4 text-white">
        <h1 className="text-xl sm:text-2xl font-bold text-center">汇信电力</h1>
        <p className="text-center text-blue-100 text-xs sm:text-sm mt-1">移动快捷查询</p>
      </div>

      {/* 功能网格 - 响应式列数 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Link 
          to="/mobile/purchase-search" 
          className="bg-white rounded-xl shadow p-3 sm:p-4 text-center hover:shadow-md transition active:bg-gray-50"
        >
          <div className="text-3xl sm:text-4xl mb-1">🛒</div>
          <div className="font-medium text-sm sm:text-base">采购查询</div>
          <div className="text-xs text-gray-400 mt-0.5">按项目/供应商</div>
        </Link>
        
        <Link 
          to="/mobile/project-search" 
          className="bg-white rounded-xl shadow p-3 sm:p-4 text-center hover:shadow-md transition active:bg-gray-50"
        >
          <div className="text-3xl sm:text-4xl mb-1">📋</div>
          <div className="font-medium text-sm sm:text-base">项目查询</div>
          <div className="text-xs text-gray-400 mt-0.5">合同/收款/采购</div>
        </Link>
        
        <Link 
          to="/mobile/supplier-search" 
          className="bg-white rounded-xl shadow p-3 sm:p-4 text-center hover:shadow-md transition active:bg-gray-50"
        >
          <div className="text-3xl sm:text-4xl mb-1">🏭</div>
          <div className="font-medium text-sm sm:text-base">供应商查询</div>
          <div className="text-xs text-gray-400 mt-0.5">采购/付款明细</div>
        </Link>
        
        <Link 
          to="/mobile/transaction-search" 
          className="bg-white rounded-xl shadow p-3 sm:p-4 text-center hover:shadow-md transition active:bg-gray-50"
        >
          <div className="text-3xl sm:text-4xl mb-1">💰</div>
          <div className="font-medium text-sm sm:text-base">收付款查询</div>
          <div className="text-xs text-gray-400 mt-0.5">流水记录</div>
        </Link>
      </div>
      
      {/* 底部提示 */}
      <div className="mt-6 text-center text-xs text-gray-400">
        电脑版请访问 ft.gdhxpower.com
      </div>
    </div>
  );
}