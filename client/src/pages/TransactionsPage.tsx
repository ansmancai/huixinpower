import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import ExportButton from '../components/ExportButton';
import ImportModal from '../components/ImportModal';

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTimer, setSearchTimer] = useState<any>(null);
  const [summary, setSummary] = useState({ totalReceipt: 0, totalPayment: 0 });
  const pageSize = 20;

  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const canExport = user?.role === 'admin' || user?.role === 'finance';

  const loadTransactions = async () => {
  console.log('加载交易记录，筛选条件:', { type, startDate, endDate, keyword });
  setLoading(true);
  try {
    let query = supabase.from('transactions').select('*, projects(name), suppliers(name)', { count: 'exact' });
    
    if (keyword) {
      query = query.or(`remark.ilike.%${keyword}%,payment_method.ilike.%${keyword}%`);
    }
    // 类型筛选
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query.range(from, to).order('date', { ascending: false });
    if (error) throw error;
    
    console.log('查询结果:', data?.length, '条');
    
    // 计算汇总（基于筛选后的数据）
    const totalReceipt = data?.filter(t => t.type === 'receipt').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const totalPayment = data?.filter(t => t.type === 'payment').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) || 0;
    setSummary({ totalReceipt, totalPayment });
    
    setTransactions(data || []);
    setTotal(count || 0);
  } catch (error) {
    console.error('加载交易记录失败', error);
  } finally {
    setLoading(false);
  }
};

  // 当 page, type, startDate, endDate 变化时重新加载
  useEffect(() => {
    loadTransactions();
  }, [page, type, startDate, endDate]);

  // 关键词搜索（防抖）
  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => { setPage(1); loadTransactions(); }, 300);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleDelete = async (id: string, no: string) => {
    if (!confirm(`确定要删除交易记录 "${no}" 吗？`)) return;
    try {
      await supabase.from('transactions').delete().eq('id', id);
      loadTransactions();
    } catch (error: any) { alert(error.message); }
  };

  const formatAmount = (amount: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  const totalPages = Math.ceil(total / pageSize);

  const paymentMethodMap: Record<string, string> = {
    bank: '银行转账',
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    draft: '汇票',
    check: '支票',
    other: '其他',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">收付款管理</h1>
        <div className="flex gap-2">
          {canExport && <ExportButton module="transactions" moduleName="收付款" filter={{ type, startDate, endDate }} />}
          {canEdit && (
            <>
              <button onClick={() => setShowImportModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">📥 导入数据</button>
              <button onClick={() => navigate('/transactions/new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ 新建收付款</button>
            </>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">收款总额</p>
          <p className="text-xl font-bold text-green-600">{formatAmount(summary.totalReceipt)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">付款总额</p>
          <p className="text-xl font-bold text-red-600">{formatAmount(summary.totalPayment)}</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="搜索备注、方式、关联项目/供应商..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="all">全部类型</option>
          <option value="receipt">收款</option>
          <option value="payment">付款</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 border rounded-lg"
          placeholder="开始日期"
        />
        <span className="self-center">至</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 border rounded-lg"
          placeholder="结束日期"
        />
      </div>

      {loading ? <div className="text-center py-12">加载中...</div> : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">日期</th>
                  <th className="px-4 py-3 text-left">类型</th>
                  <th className="px-4 py-3 text-right">金额</th>
                  <th className="px-4 py-3 text-left">方式</th>
                  <th className="px-4 py-3 text-left">关联项目</th>
                  <th className="px-4 py-3 text-left">关联供应商</th>
                  <th className="px-4 py-3 text-left">关联采购</th>
                  <th className="px-4 py-3 text-left">备注</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={t.type === 'receipt' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {t.type === 'receipt' ? '收款' : '付款'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={t.type === 'receipt' ? 'text-green-600' : 'text-red-600'}>
                        {t.type === 'receipt' ? '+' : '-'}{formatAmount(Math.abs(parseFloat(t.amount)))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{paymentMethodMap[t.payment_method] || t.payment_method}</td>
                    <td className="px-4 py-3 text-sm">
                      {t.project_id ? <Link to={`/projects/${t.project_id}`} className="text-blue-600 hover:underline">{t.projects?.name}</Link> : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {t.supplier_id ? <Link to={`/suppliers/${t.supplier_id}`} className="text-blue-600 hover:underline">{t.suppliers?.name}</Link> : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {t.purchase_id ? <Link to={`/purchases/${t.purchase_id}`} className="text-blue-600 hover:underline">查看</Link> : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[200px] truncate">{t.remark || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Link to={`/transactions/${t.id}`} className="text-blue-600 text-sm">查看</Link>
                        {canEdit && <Link to={`/transactions/${t.id}/edit`} className="text-blue-600 text-sm">编辑</Link>}
                        {user?.role === 'admin' && <button onClick={() => handleDelete(t.id, t.id)} className="text-red-600 text-sm">删除</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded">上一页</button>
              <span>第 {page} / {totalPages} 页</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded">下一页</button>
            </div>
          )}
        </>
      )}

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => { loadTransactions(); setShowImportModal(false); }}
        module="transactions"
        moduleName="收付款"
      />
    </div>
  );
}