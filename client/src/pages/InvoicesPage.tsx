import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('all');
  const [projectId, setProjectId] = useState('all');
  const [status, setStatus] = useState('all');
  const [searchTimer, setSearchTimer] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const pageSize = 20;

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [projRes, supRes] = await Promise.all([
          api.projects.list({ pageSize: 100 }),
          api.suppliers.list({ pageSize: 100 })
        ]);
        setProjects(projRes.data);
        setSuppliers(supRes.data);
      } catch (error) {
        console.error(error);
      }
    };
    loadOptions();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize, keyword };
      if (type !== 'all') params.type = type;
      if (projectId !== 'all') params.projectId = projectId;
      if (status !== 'all') params.status = status;
      const result = await api.invoices.list(params);
      setInvoices(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('加载发票失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [page, type, projectId, status]);

  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      setPage(1);
      loadInvoices();
    }, 300);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleDelete = async (id: string, no: string) => {
    if (!confirm(`确定要删除发票 "${no}" 吗？`)) return;
    try {
      await api.invoices.delete(id);
      loadInvoices();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleExport = async () => {
    try {
      await api.export.exportData('invoices', { keyword, type, projectId, status });
      alert('导出功能开发中，模拟导出成功');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const typeMap: Record<string, string> = { input: '进项', output: '销项' };
  const statusMap: Record<string, string> = { unpaid: '未付款', paid: '已付款', cancelled: '作废' };
  const formatAmount = (amount: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  const totalPages = Math.ceil(total / pageSize);
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || id || '-';
  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || id || '-';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">发票管理</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            📥 导出数据
          </button>
          {canEdit && (
            <button onClick={() => navigate('/invoices/new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              + 新建发票
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="搜索发票号码..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="all">全部类型</option>
          <option value="input">进项</option>
          <option value="output">销项</option>
        </select>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="all">全部项目</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="all">全部状态</option>
          <option value="unpaid">未付款</option>
          <option value="paid">已付款</option>
          <option value="cancelled">作废</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">发票类型</th>
                  <th className="px-4 py-3 text-left">发票号码</th>
                  <th className="px-4 py-3 text-right">金额</th>
                  <th className="px-4 py-3 text-right">税额</th>
                  <th className="px-4 py-3 text-right">总金额</th>
                  <th className="px-4 py-3 text-left">开票日期</th>
                  <th className="px-4 py-3 text-left">对方名称</th>
                  <th className="px-4 py-3 text-left">所属项目</th>
                  <th className="px-4 py-3 text-center">状态</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{typeMap[i.type] || i.type}</td>
                    <td className="px-4 py-3">
                      <Link to={`/invoices/${i.id}`} className="text-blue-600 hover:underline">
                        {i.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">{formatAmount(parseFloat(i.amount))}</td>
                    <td className="px-4 py-3 text-right">{i.taxAmount ? formatAmount(parseFloat(i.taxAmount)) : '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatAmount(parseFloat(i.totalAmount))}</td>
                    <td className="px-4 py-3 text-sm">{new Date(i.invoiceDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{getSupplierName(i.supplierId)}</td>
                    <td className="px-4 py-3 text-sm">{getProjectName(i.projectId)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${i.status === 'paid' ? 'bg-green-100' : i.status === 'cancelled' ? 'bg-gray-100' : 'bg-yellow-100'}`}>
                        {statusMap[i.status] || i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Link to={`/invoices/${i.id}`} className="text-blue-600 text-sm">查看</Link>
                        {canEdit && <Link to={`/invoices/${i.id}/edit`} className="text-blue-600 text-sm">编辑</Link>}
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(i.id, i.invoiceNo)} className="text-red-600 text-sm">删除</button>
                        )}
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
    </div>
  );
}