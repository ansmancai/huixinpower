import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('all');
  const [summary, setSummary] = useState({ totalReceipt: 0, totalPayment: 0, unpaidReceipt: 0, unpaidPayment: 0 });
  const [searchTimer, setSearchTimer] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const pageSize = 20;

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [projRes, supRes] = await Promise.all([api.projects.list({ pageSize: 100 }), api.suppliers.list({ pageSize: 100 })]);
        setProjects(projRes.data);
        setSuppliers(supRes.data);
      } catch (error) { console.error(error); }
    };
    loadOptions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize, keyword };
      if (type !== 'all') params.type = type;
      const result = await api.transactions.list(params);
      setTransactions(result.data);
      setTotal(result.total);
      if (result.summary) setSummary(result.summary);
    } catch (error) {
      console.error('加载交易记录失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [page, type]);

  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => { setPage(1); loadTransactions(); }, 300);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleDelete = async (id: string, no: string) => {
    if (!confirm(`确定要删除交易记录 "${no}" 吗？`)) return;
    try {
      await api.transactions.delete(id);
      loadTransactions();
    } catch (error: any) { alert(error.message); }
  };

  const handleExport = async () => {
    try {
      await api.export.exportData('transactions', { keyword, type });
      alert('导出功能开发中，模拟导出成功');
    } catch (error: any) { alert(error.message); }
  };

  const formatAmount = (amount: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  const totalPages = Math.ceil(total / pageSize);

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || id || '-';
  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || id || '-';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">收付款管理</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">📥 导出数据</button>
          {canEdit && <button onClick={() => navigate('/transactions/new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ 新建收付款</button>}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">收款总额</p><p className="text-xl font-bold text-green-600">{formatAmount(summary.totalReceipt)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">付款总额</p><p className="text-xl font-bold text-red-600">{formatAmount(summary.totalPayment)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">未收款总额</p><p className="text-xl font-bold text-orange-600">{formatAmount(summary.unpaidReceipt)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">未付款总额</p><p className="text-xl font-bold text-red-600">{formatAmount(summary.unpaidPayment)}</p></div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input type="text" placeholder="搜索备注、方式、关联项目/供应商..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">全部类型</option><option value="receipt">收款</option><option value="payment">付款</option></select>
      </div>

      {loading ? <div className="text-center py-12">加载中...</div> : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left">日期</th><th className="px-4 py-3 text-left">类型</th><th className="px-4 py-3 text-right">金额</th><th className="px-4 py-3 text-left">方式</th>
                <th className="px-4 py-3 text-left">关联项目</th><th className="px-4 py-3 text-left">关联供应商</th><th className="px-4 py-3 text-left">关联采购</th>
                <th className="px-4 py-3 text-left">备注</th><th className="px-4 py-3 text-center">操作</th>
              </tr></thead>
              <tbody className="divide-y">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><span className={t.type === 'receipt' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{t.type === 'receipt' ? '收款' : '付款'}</span></td>
                    <td className="px-4 py-3 text-right"><span className={t.type === 'receipt' ? 'text-green-600' : 'text-red-600'}>{t.type === 'receipt' ? '+' : '-'}{formatAmount(Math.abs(parseFloat(t.amount)))}</span></td>
                    <td className="px-4 py-3 text-sm">{t.paymentMethod === 'bank' ? '银行转账' : t.paymentMethod === 'cash' ? '现金' : t.paymentMethod === 'wechat' ? '微信' : '支付宝'}</td>
                    <td className="px-4 py-3 text-sm">{t.projectId ? <Link to={`/projects/${t.projectId}`} className="text-blue-600 hover:underline">{getProjectName(t.projectId)}</Link> : '-'}</td>
                    <td className="px-4 py-3 text-sm">{t.supplierId ? <Link to={`/suppliers/${t.supplierId}`} className="text-blue-600 hover:underline">{getSupplierName(t.supplierId)}</Link> : '-'}</td>
                    <td className="px-4 py-3 text-sm">{t.purchaseId ? <Link to={`/purchases/${t.purchaseId}`} className="text-blue-600 hover:underline">查看</Link> : '-'}</td>
                    <td className="px-4 py-3 text-sm max-w-[200px] truncate">{t.remark || '-'}</td>
                    <td className="px-4 py-3 text-center"><div className="flex justify-center gap-2"><Link to={`/transactions/${t.id}`} className="text-blue-600 text-sm">查看</Link>{canEdit && <Link to={`/transactions/${t.id}/edit`} className="text-blue-600 text-sm">编辑</Link>}{user?.role === 'admin' && <button onClick={() => handleDelete(t.id, t.id)} className="text-red-600 text-sm">删除</button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="flex justify-center gap-2 mt-6"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded">上一页</button><span>第 {page} / {totalPages} 页</span><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded">下一页</button></div>}
        </>
      )}
    </div>
  );
}