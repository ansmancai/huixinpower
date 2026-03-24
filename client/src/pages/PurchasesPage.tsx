import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const testPurchases = [
  { id: '1', purchaseDate: '2026-02-03', purchaseNo: 'HX2026001-GYS0001-001', content: '800kVA变压器', projectName: '南城正通达', supplierName: '江苏龙创电气有限公司', amount: 81000, logisticsStatus: 'arrived', paidAmount: 0, invoicedAmount: 0 },
  { id: '2', purchaseDate: '2026-03-11', purchaseNo: 'HX2026002-GYS0016-001', content: '海虹变压器', projectName: '万宏广场', supplierName: '东莞市同智电气科技有限公司', amount: 373000, logisticsStatus: 'ordered', paidAmount: 74600, invoicedAmount: 0 },
  { id: '3', purchaseDate: '2026-03-11', purchaseNo: 'HX2026002-GYS0017-001', content: '高低压电缆', projectName: '万宏广场', supplierName: '东莞市民兴电缆有限公司', amount: 181985.35, logisticsStatus: 'ordered', paidAmount: 45035, invoicedAmount: 0 },
  { id: '4', purchaseDate: '2023-01-01', purchaseNo: 'HX2023001-GYS0012-001', content: '土建', projectName: '万江4号楼', supplierName: '东莞市雷风恒建设工程有限公司', amount: 46000, logisticsStatus: 'arrived', paidAmount: 46000, invoicedAmount: 46000 },
];

const statusMap: Record<string, string> = { arrived: '已到货', ordered: '已下单', pending: '待发货' };

export default function PurchasesPage() {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const purchases = testPurchases;

  const formatAmount = (amount: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  const totalAmount = purchases.reduce((s, p) => s + p.amount, 0);
  const totalPaid = purchases.reduce((s, p) => s + p.paidAmount, 0);
  const totalInvoiced = purchases.reduce((s, p) => s + p.invoicedAmount, 0);
  const uniqueSuppliers = new Set(purchases.map(p => p.supplierName)).size;

  const getPaymentStatus = (p: any) => {
    if (p.paidAmount >= p.amount) return '已付清';
    if (p.paidAmount > 0) return '部分付';
    return '未付款';
  };

  const getInvoiceStatus = (p: any) => {
    if (p.invoicedAmount >= p.amount) return '已收票';
    if (p.invoicedAmount > 0) return '部分收票';
    return '未收票';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">采购管理</h1>
        <div className="flex gap-2">
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">📥 导出数据</button>
          {canEdit && <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ 新建采购</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">采购记录总数</p><p className="text-xl font-bold">{purchases.length} 笔</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">采购总金额</p><p className="text-xl font-bold text-blue-600">{formatAmount(totalAmount)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">已收票金额</p><p className="text-xl font-bold text-green-600">{formatAmount(totalInvoiced)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">涉及供应商数</p><p className="text-xl font-bold">{uniqueSuppliers} 家</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">未付款总额</p><p className="text-xl font-bold text-red-600">{formatAmount(totalAmount - totalPaid)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">未收票总额</p><p className="text-xl font-bold text-orange-600">{formatAmount(totalAmount - totalInvoiced)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">已收票未付款</p><p className="text-xl font-bold text-yellow-600">{formatAmount(totalInvoiced - totalPaid)}</p></div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input type="text" placeholder="搜索采购内容、项目名称、供应商..." className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg" />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">采购日期</th><th className="px-4 py-3 text-left">采购编号</th><th className="px-4 py-3 text-left">采购内容</th>
              <th className="px-4 py-3 text-left">所属项目</th><th className="px-4 py-3 text-left">供应商</th><th className="px-4 py-3 text-right">金额</th>
              <th className="px-4 py-3 text-center">物流</th><th className="px-4 py-3 text-center">付款</th><th className="px-4 py-3 text-center">收票</th><th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {purchases.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{new Date(p.purchaseDate).toLocaleDateString()}</td>
                <td className="px-4 py-3"><Link to={`/purchases/${p.id}`} className="text-blue-600 hover:underline">{p.purchaseNo}</Link></td>
                <td className="px-4 py-3 text-sm max-w-[200px] truncate">{p.content}</td>
                <td className="px-4 py-3 text-sm">{p.projectName}</td>
                <td className="px-4 py-3 text-sm">{p.supplierName}</td>
                <td className="px-4 py-3 text-right font-medium">{formatAmount(p.amount)}</td>
                <td className="px-4 py-3 text-center"><span className="px-2 py-1 rounded-full text-xs bg-blue-100">{statusMap[p.logisticsStatus]}</span></td>
                <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs ${getPaymentStatus(p) === '已付清' ? 'bg-green-100' : getPaymentStatus(p) === '部分付' ? 'bg-yellow-100' : 'bg-red-100'}`}>{getPaymentStatus(p)}</span></td>
                <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs ${getInvoiceStatus(p) === '已收票' ? 'bg-green-100' : getInvoiceStatus(p) === '部分收票' ? 'bg-yellow-100' : 'bg-red-100'}`}>{getInvoiceStatus(p)}</span></td>
                <td className="px-4 py-3 text-center"><Link to={`/purchases/${p.id}`} className="text-blue-600 text-sm">查看</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}