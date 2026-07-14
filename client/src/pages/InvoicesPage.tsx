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
  const [deliveryStatus, setDeliveryStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [totalAmountSum, setTotalAmountSum] = useState(0);
  const [totalTaxSum, setTotalTaxSum] = useState(0);
  const [totalTotalSum, setTotalTotalSum] = useState(0);
  // 批量操作相关
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
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

  const resetFilters = () => {
    setKeyword('');
    setType('all');
    setProjectId('all');
    setStatus('all');
    setDeliveryStatus('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let baseQuery = supabase.from('invoices').select('*, projects(name), suppliers(name), file_path', { count: 'exact' });
      
      if (keyword) {
        const { data: matchedProjects } = await supabase.from('projects').select('id').ilike('name', `%${keyword}%`);
        const projectIds = matchedProjects?.map(p => p.id) || [];
        const conditions = [`invoice_no.ilike.%${keyword}%`, `supplier_name.ilike.%${keyword}%`];
        if (projectIds.length) conditions.push(`project_id.in.(${projectIds.join(',')})`);
        baseQuery = baseQuery.or(conditions.join(','));
      }
      
      if (type !== 'all') baseQuery = baseQuery.eq('type', type);
      if (projectId !== 'all') baseQuery = baseQuery.eq('project_id', projectId);
      if (status !== 'all') baseQuery = baseQuery.eq('status', status);
      if (dateFrom) baseQuery = baseQuery.gte('invoice_date', dateFrom);
      if (dateTo) baseQuery = baseQuery.lte('invoice_date', dateTo);
      if (deliveryStatus === 'delivered') baseQuery = baseQuery.not('delivered_at', 'is', null);
      if (deliveryStatus === 'undelivered') baseQuery = baseQuery.is('delivered_at', null);

      const { data: allData } = await baseQuery;
      let sumAmount = 0, sumTax = 0, sumTotal = 0;
      allData?.forEach(item => {
        sumAmount += parseFloat(item.amount) || 0;
        sumTax += parseFloat(item.tax_amount) || 0;
        sumTotal += parseFloat(item.total_amount) || 0;
      });
      setTotalAmountSum(sumAmount);
      setTotalTaxSum(sumTax);
      setTotalTotalSum(sumTotal);

      const { count: totalCount } = await baseQuery;
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data: pageData } = await baseQuery.range(from, to).order('invoice_date', { ascending: false });
      
      setInvoices(pageData || []);
      setTotal(totalCount || 0);
      if (!batchMode) {
        setSelectedIds(new Set());
        setSelectAll(false);
      }
    } catch (error) {
      console.error('加载发票失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [page, type, projectId, status, keyword, dateFrom, dateTo, deliveryStatus]);

  const handleDelete = async (id: string, no: string) => {
    if (!confirm(`确定要删除发票 "${no}" 吗？`)) return;
    try {
      await supabase.from('invoices').delete().eq('id', id);
      loadInvoices();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleBatchDeliver = async () => {
    if (selectedIds.size === 0) {
      alert('请先选择要标记的发票');
      return;
    }
    const ids = Array.from(selectedIds);
    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ delivered_at: now })
        .in('id', ids);
      if (error) throw error;
      alert(`成功标记 ${ids.length} 张发票为已交付`);
      setBatchMode(false);
      setSelectedIds(new Set());
      setSelectAll(false);
      loadInvoices();
    } catch (error: any) {
      alert('标记失败: ' + error.message);
    }
  };

  const handleBatchUndeliver = async () => {
    if (selectedIds.size === 0) {
      alert('请先选择要取消标记的发票');
      return;
    }
    const ids = Array.from(selectedIds);
    if (!confirm(`确定要取消 ${ids.length} 张发票的交付标记吗？`)) return;
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ delivered_at: null })
        .in('id', ids);
      if (error) throw error;
      alert(`成功取消 ${ids.length} 张发票的交付标记`);
      setBatchMode(false);
      setSelectedIds(new Set());
      setSelectAll(false);
      loadInvoices();
    } catch (error: any) {
      alert('取消标记失败: ' + error.message);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      const ids = invoices.map(i => i.id);
      setSelectedIds(new Set(ids));
      setSelectAll(true);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
    setSelectAll(newSet.size === invoices.length && invoices.length > 0);
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedIds(new Set());
    setSelectAll(false);
  };

  const typeMap: Record<string, string> = { input: '进项', output: '销项' };
  const statusMap: Record<string, string> = { unpaid: '未付款', paid: '已付款', partial: '部分付款', cancelled: '作废' };
  const formatAmount = (amount: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  const totalPages = Math.ceil(total / pageSize);

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

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-gray-500 mb-1">搜索</label>
          <input 
            type="text" 
            placeholder="搜索发票号码、对方名称、项目名称..." 
            value={keyword} 
            onChange={(e) => setKeyword(e.target.value)} 
            className="w-full px-3 py-2 border rounded-lg" 
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-500 mb-1">类型</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border rounded-lg w-32">
            <option value="all">全部</option>
            <option value="input">进项</option>
            <option value="output">销项</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-gray-500 mb-1">开始日期</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border rounded-lg w-40"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-500 mb-1">结束日期</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border rounded-lg w-40"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-500 mb-1">项目</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="px-3 py-2 border rounded-lg w-48">
            <option value="all">全部项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-gray-500 mb-1">状态</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded-lg w-32">
            <option value="all">全部</option>
            <option value="unpaid">未付款</option>
            <option value="partial">部分付款</option> 
            <option value="paid">已付款</option>
            <option value="cancelled">作废</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-gray-500 mb-1">交付状态</label>
          <select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value)} className="px-3 py-2 border rounded-lg w-32">
            <option value="all">全部</option>
            <option value="delivered">已交付</option>
            <option value="undelivered">未交付</option>
          </select>
        </div>
        
        <button
          onClick={resetFilters}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
        >
          重置筛选
        </button>
      </div>

      {/* 批量操作工具栏 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {!batchMode ? (
          <button
            onClick={() => setBatchMode(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            📋 批量标记交付
          </button>
        ) : (
          <>
            <button
              onClick={handleBatchDeliver}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              ✅ 标记为已交付 ({selectedIds.size})
            </button>
            <button
              onClick={handleBatchUndeliver}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              ↩️ 取消标记 ({selectedIds.size})
            </button>
            <button
              onClick={exitBatchMode}
              className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
            >
              退出批量模式
            </button>
          </>
        )}
      </div>

      {loading ? <div className="text-center py-12">加载中...</div> : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50">
                <tr>
                  {batchMode && (
                    <th className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left">发票类型</th>
                  <th className="px-4 py-3 text-left">发票号码</th>
                  <th className="px-4 py-3 text-right">金额</th>
                  <th className="px-4 py-3 text-right">税额</th>
                  <th className="px-4 py-3 text-right">总金额</th>
                  <th className="px-4 py-3 text-left">开票日期</th>
                  <th className="px-4 py-3 text-left">对方名称</th>
                  <th className="px-4 py-3 text-left">所属项目</th>
                  <th className="px-4 py-3 text-center">附件</th>
                  <th className="px-4 py-3 text-center">状态</th>
                  <th className="px-4 py-3 text-center">交付状态</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    {batchMode && (
                      <td className="px-2 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(i.id)}
                          onChange={() => toggleSelect(i.id)}
                          className="w-4 h-4"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm">{typeMap[i.type] || i.type}</td>
                    <td className="px-4 py-3">
                      <Link to={`/invoices/${i.id}`} className="text-blue-600 hover:underline">
                        {i.invoice_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">{formatAmount(parseFloat(i.amount))}</td>
                    <td className="px-4 py-3 text-right">{i.tax_amount ? formatAmount(parseFloat(i.tax_amount)) : '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatAmount(parseFloat(i.total_amount))}</td>
                    <td className="px-4 py-3 text-sm">{new Date(i.invoice_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{i.supplier_name || i.suppliers?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{i.projects?.name || i.project_id || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {i.file_path ? (
                        <a 
                          href={`${supabase.storage.from('invoices').getPublicUrl(i.file_path).data.publicUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:text-red-700 text-lg"
                        >
                          📄
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${i.status === 'paid' ? 'bg-green-100 text-green-800' : i.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {statusMap[i.status] || i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {i.delivered_at ? (
                        <span className="text-green-600 text-sm">
                          {new Date(i.delivered_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-red-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex justify-center gap-2">
                        <Link to={`/invoices/${i.id}`} className="text-blue-600 text-sm whitespace-nowrap">查看</Link>
                        {canEdit && <Link to={`/invoices/${i.id}/edit`} className="text-blue-600 text-sm whitespace-nowrap">编辑</Link>}
                        {user?.role === 'admin' && <button onClick={() => handleDelete(i.id, i.invoice_no)} className="text-red-600 text-sm whitespace-nowrap">删除</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {total > 0 && (
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={batchMode ? 13 : 12} className="px-4 py-3 text-right font-medium">
                      合计：{formatAmount(totalAmountSum)} / {formatAmount(totalTaxSum)} / {formatAmount(totalTotalSum)}
                    </td>
                  </tr>
                </tfoot>
              )}
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