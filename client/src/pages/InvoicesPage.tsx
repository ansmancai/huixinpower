import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import ExportButton from '../components/ExportButton';
import ImportModal from '../components/ImportModal';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTimer, setSearchTimer] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const pageSize = 20;

  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const canExport = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadProjects = async () => {
      const { data } = await supabase.from('projects').select('id, name').limit(100);
      setProjects(data || []);
    };
    loadProjects();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let query = supabase.from('invoices').select('*, projects(name), suppliers(name)', { count: 'exact' });
      
      if (keyword) {
  // 先搜索匹配的项目ID
  const { data: matchedProjects } = await supabase
    .from('projects')
    .select('id')
    .ilike('name', `%${keyword}%`);
  const projectIds = matchedProjects?.map(p => p.id) || [];
  
  // 搜索匹配的供应商ID
  const { data: matchedSuppliers } = await supabase
    .from('suppliers')
    .select('id')
    .ilike('name', `%${keyword}%`);
  const supplierIds = matchedSuppliers?.map(s => s.id) || [];
  
  // 构建搜索条件
  const conditions = [`invoice_no.ilike.%${keyword}%`];
  if (projectIds.length > 0) {
    conditions.push(`project_id.in.(${projectIds.join(',')})`);
  }
  if (supplierIds.length > 0) {
    conditions.push(`supplier_id.in.(${supplierIds.join(',')})`);
  }
  
  query = query.or(conditions.join(','));
}
      if (type !== 'all') {
        query = query.eq('type', type);
      }
      if (projectId !== 'all') {
        query = query.eq('project_id', projectId);
      }
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await query.range(from, to).order('invoice_date', { ascending: false });
      if (error) throw error;
      
      setInvoices(data || []);
      setTotal(count || 0);
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
    const timer = setTimeout(() => { setPage(1); loadInvoices(); }, 300);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleDelete = async (id: string, no: string) => {
    if (!confirm(`确定要删除发票 "${no}" 吗？`)) return;
    try {
      await supabase.from('invoices').delete().eq('id', id);
      loadInvoices();
    } catch (error: any) { alert(error.message); }
  };

  const typeMap: Record<string, string> = { input: '进项', output: '销项' };
  const statusMap: Record<string, string> = { unpaid: '未付款', paid: '已付款', cancelled: '作废' };
  const formatAmount = (amount: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  const totalPages = Math.ceil(total / pageSize);

  const importColumns = [
    { key: 'type', label: '发票类型', required: true },
    { key: 'invoice_no', label: '发票号码', required: true },
    { key: 'amount', label: '金额', required: true },
    { key: 'tax_amount', label: '税额', required: false },
    { key: 'total_amount', label: '总金额', required: false },
    { key: 'invoice_date', label: '开票日期', required: true },
    { key: 'supplier_name', label: '对方名称', required: false },
    { key: 'project_name', label: '所属项目', required: false },
    { key: 'purchase_no', label: '关联采购', required: false },
    { key: 'status', label: '状态', required: false },
    { key: 'remark', label: '备注', required: false },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">发票管理</h1>
        <div className="flex gap-2">
          {canExport && <ExportButton module="invoices" moduleName="发票" filter={{ type, projectId, status }} />}
          {canEdit && (
            <>
              <button onClick={() => setShowImportModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">📥 导入数据</button>
              <button onClick={() => navigate('/invoices/new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ 新建发票</button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input type="text" placeholder="搜索发票号码..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg" />
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

      {loading ? <div className="text-center py-12">加载中...</div> : (
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
                {invoices.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{typeMap[i.type] || i.type}</td>
                    <td className="px-4 py-3"><Link to={`/invoices/${i.id}`} className="text-blue-600 hover:underline">{i.invoice_no}</Link></td>
                    <td className="px-4 py-3 text-right">{formatAmount(parseFloat(i.amount))}</td>
                    <td className="px-4 py-3 text-right">{i.tax_amount ? formatAmount(parseFloat(i.tax_amount)) : '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatAmount(parseFloat(i.total_amount))}</td>
                    <td className="px-4 py-3 text-sm">{new Date(i.invoice_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{i.suppliers?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{i.projects?.name || i.project_id || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${i.status === 'paid' ? 'bg-green-100 text-green-800' : i.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {statusMap[i.status] || i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Link to={`/invoices/${i.id}`} className="text-blue-600 text-sm">查看</Link>
                        {canEdit && <Link to={`/invoices/${i.id}/edit`} className="text-blue-600 text-sm">编辑</Link>}
                        {user?.role === 'admin' && <button onClick={() => handleDelete(i.id, i.invoice_no)} className="text-red-600 text-sm">删除</button>}
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
        onSuccess={() => { loadInvoices(); setShowImportModal(false); }}
        module="invoices"
        moduleName="发票"
        
      />
    </div>
  );
}