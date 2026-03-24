import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const testSuppliers = [
  { id: '1', code: 'GYS0001', name: '广东宏业电气有限公司', category: 'equipment', contactPerson: '孔令超', phone: '13800138000', purchasedAmount: 72000, paidAmount: 0, receivedAmount: 0 },
  { id: '2', code: 'GYS0001', name: '江苏龙创电气有限公司', category: 'equipment', contactPerson: '龙杰峰', phone: '13900139000', purchasedAmount: 369500, paidAmount: 0, receivedAmount: 97000 },
  { id: '3', code: 'GYS0012', name: '东莞市雷风恒建设工程有限公司', category: 'construction', contactPerson: '郑敏芝', phone: '', purchasedAmount: 78951, paidAmount: 78951, receivedAmount: 0 },
  { id: '4', code: 'GYS0019', name: '东莞多能建设有限公司', category: 'construction', contactPerson: '郑敏芝', phone: '', purchasedAmount: 30000, paidAmount: 0, receivedAmount: 0 },
];

const categoryMap: Record<string, string> = {
  equipment: '设备材料',
  installation: '安装',
  construction: '土建',
  other: '生活/其他',
};

export default function SuppliersPage() {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const suppliers = testSuppliers;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  };

  const totalPurchase = suppliers.reduce((sum, s) => sum + s.purchasedAmount, 0);
  const totalPaid = suppliers.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalReceived = suppliers.reduce((sum, s) => sum + s.receivedAmount, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">供应商管理</h1>
        <div className="flex gap-2">
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">📥 导出数据</button>
          {canEdit && <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ 新建供应商</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">已采购总额</p><p className="text-xl font-bold text-blue-600">{formatAmount(totalPurchase)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">已付款总额</p><p className="text-xl font-bold text-green-600">{formatAmount(totalPaid)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">已收款总额</p><p className="text-xl font-bold text-orange-600">{formatAmount(totalReceived)}</p></div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <input type="text" placeholder="搜索供应商名称、编号..." className="w-full md:w-1/3 px-3 py-2 border rounded-lg" />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">供应商编号</th><th className="px-4 py-3 text-left">供应商名称</th><th className="px-4 py-3 text-left">类别</th>
              <th className="px-4 py-3 text-left">联系人</th><th className="px-4 py-3 text-left">联系电话</th><th className="px-4 py-3 text-right">已采购</th>
              <th className="px-4 py-3 text-right">已付款</th><th className="px-4 py-3 text-right">欠款</th><th className="px-4 py-3 text-right">欠票</th><th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {suppliers.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{s.code}</td>
                <td className="px-4 py-3"><Link to={`/suppliers/${s.id}`} className="text-blue-600 hover:underline">{s.name}</Link></td>
                <td className="px-4 py-3 text-sm">{categoryMap[s.category]}</td>
                <td className="px-4 py-3 text-sm">{s.contactPerson || '-'}</td>
                <td className="px-4 py-3 text-sm">{s.phone || '-'}</td>
                <td className="px-4 py-3 text-right">{formatAmount(s.purchasedAmount)}</td>
                <td className="px-4 py-3 text-right text-green-600">{formatAmount(s.paidAmount)}</td>
                <td className="px-4 py-3 text-right text-red-600">{formatAmount(s.purchasedAmount - s.paidAmount)}</td>
                <td className="px-4 py-3 text-right text-orange-600">{formatAmount(s.purchasedAmount - s.receivedAmount)}</td>
                <td className="px-4 py-3 text-center"><Link to={`/suppliers/${s.id}`} className="text-blue-600 text-sm">查看</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}