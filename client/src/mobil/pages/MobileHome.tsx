import { Link } from 'react-router-dom';

export default function MobileHome() {
  return (
    <div>
      {/* 快速录入 */}
      <div className="mb-8">
        <h2 className="text-md font-semibold text-gray-700 mb-3">📝 快速录入</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link to="/mobile/quick-project" className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl mb-1">🏗️</div>
            <div className="text-sm font-medium">项目</div>
          </Link>
          <Link to="/mobile/quick-purchase" className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl mb-1">🛒</div>
            <div className="text-sm font-medium">采购</div>
          </Link>
          <Link to="/mobile/quick-transaction" className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-sm font-medium">收付款</div>
          </Link>
        </div>
      </div>

      {/* 数据查询 */}
      <div>
        <h2 className="text-md font-semibold text-gray-700 mb-3">🔍 数据查询</h2>
        <div className="space-y-2">
          <Link to="/mobile/project-search" className="block bg-white rounded-lg shadow p-3">
            📋 项目查询
          </Link>
          <Link to="/mobile/purchase-search" className="block bg-white rounded-lg shadow p-3">
            🛒 采购查询
          </Link>
          <Link to="/mobile/supplier-search" className="block bg-white rounded-lg shadow p-3">
            🏭 供应商查询
          </Link>
          <Link to="/mobile/transaction-search" className="block bg-white rounded-lg shadow p-3">
            💸 收付款查询
          </Link>
        </div>
      </div>
    </div>
  );
}