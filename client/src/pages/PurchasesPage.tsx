import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import ExportButton from '../components/ExportButton';
import ImportModal from '../components/ImportModal';

export default function PurchasesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [allPurchases, setAllPurchases] = useState<any[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [projectId, setProjectId] = useState('all');
  const [supplierId, setSupplierId] = useState('all');
  const [logisticsStatus, setLogisticsStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [invoiceStatus, setInvoiceStatus] = useState('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalAmount: 0, totalInvoiced: 0, totalPaid: 0, uniqueSuppliers: 0 });
  const pageSize = 20;

  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const canExport = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadOptions = async () => {
      const [projRes, supRes] = await Promise.all([
        supabase.from('projects').select('id, name').limit(100),
        supabase.from('suppliers').select('id, name').limit(100),
      ]);
      setProjects(projRes.data || []);
      setSuppliers(supRes.data || []);
    };
    loadOptions();
  }, []);

  // 加载所有采购数据
  const loadAllPurchases = async () => {
    setLoading(true);
    try {
      let query = supabase.from('purchases').select('*, projects(name), suppliers(name)');
      
      if (keyword) {
        const { data: matchedProjects } = await supabase
          .from('projects')
          .select('id')
          .ilike('name', `%${keyword}%`);
        const { data: matchedSuppliers } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', `%${keyword}%`);
        const projectIds = matchedProjects?.map(p => p.id) || [];
        const supplierIds = matchedSuppliers?.map(s => s.id) || [];
        
        const conditions = [`content.ilike.%${keyword}%`];
        if (projectIds.length) conditions.push(`project_id.in.(${projectIds.join(',')})`);
        if (supplierIds.length) conditions.push(`supplier_id.in.(${supplierIds.join(',')})`);
        query = query.or(conditions.join(','));
      }
      
      if (projectId !== 'all') query = query.eq('project_id', projectId);
      if (supplierId !== 'all') query = query.eq('supplier_id', supplierId);
      if (logisticsStatus !== 'all') query = query.eq('logistics_status', logisticsStatus);
      
      const { data, error } = await query.order('purchase_date', { ascending: false });
      if (error) throw error;
      
      const purchaseIds = data?.map(p => p.id) || [];
      if (purchaseIds.length > 0) {
        const { data: payments } = await supabase
          .from('transactions')
          .select('purchase_id, amount')
          .eq('type', 'payment')
          .in('purchase_id', purchaseIds);
        
        const { data: invoices } = await supabase
          .from('invoices')
          .select('purchase_id, total_amount')
          .eq('type', 'input')
          .in('purchase_id', purchaseIds);
        
        const paymentMap: Record<string, number> = {};
        const invoiceMap: Record<string, number> = {};
        
        payments?.forEach(p => {
          paymentMap[p.purchase_id] = (paymentMap[p.purchase_id] || 0) + Math.abs(parseFloat(p.amount));
        });
        invoices?.forEach(i => {
          invoiceMap[i.purchase_id] = (invoiceMap[i.purchase_id] || 0) + parseFloat(i.total_amount);
        });
        
        data?.forEach(p => {
          p.paidAmount = paymentMap[p.id] || 0;
          p.invoicedAmount = invoiceMap[p.id] || 0;
        });
        
        const totalAmount = data.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalPaid = Object.values(paymentMap).reduce((a, b) => a + b, 0);
        const totalInvoiced = Object.values(invoiceMap).reduce((a, b) => a + b, 0);
        const uniqueSuppliers = new Set(data.map(p => p.supplier_id).filter(Boolean)).size;
        setSummary({ totalAmount, totalPaid, totalInvoiced, uniqueSuppliers });
      }
      
      setAllPurchases(data || []);
    } catch (error) {
      console.error('加载采购单失败', error);
    } finally {
      setLoading(false);
    }
  };

  // 前端筛选和分页
  useEffect(() => {
    if (!allPurchases.length) return;
    
    let filtered = [...allPurchases];
    
    // 付款状态筛选
    if (paymentStatus !== 'all') {
      filtered = filtered.filter(p => {
        const paidPercent = (p.paidAmount / parseFloat(p.amount)) * 100;
        if (paymentStatus === 'paid') return paidPercent >= 100;
        if (paymentStatus === 'partial') return paidPercent > 0 && paidPercent < 100;
        return paidPercent === 0;
      });
    }
    
    // 收票状态筛选
    if (invoiceStatus !== 'all') {
      filtered = filtered.filter(p => {
        const invoicedPercent = (p.invoicedAmount / parseFloat(p.amount)) * 100;
        if (invoiceStatus === 'invoiced') return invoicedPercent >= 100;
        if (invoiceStatus === 'partial') return invoicedPercent > 0 && invoicedPercent < 100;
        return invoicedPercent === 0;
      });
    }
    
    setFilteredPurchases(filtered);
    setPage(1);
  }, [allPurchases, paymentStatus, invoiceStatus]);

  useEffect(() => {
    loadAllPurchases();
  }, [keyword, projectId, supplierId, logisticsStatus]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除采购单 "${name}" 吗？`)) return;
    try {
      await supabase.from('purchases').delete().eq('id', id);
      loadAllPurchases();
    } catch (error: any) { alert(error.message); }
  };

  const statusMap: Record<string, string> = { arrived: '已到货', ordered: '已下单', pending: '待发货' };
  const formatAmount = (amount: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  const totalPages = Math.ceil(filteredPurchases.length / pageSize);
  const currentPageData = filteredPurchases.slice((page - 1) * pageSize, page * pageSize);

  const getPaymentStatus = (p: any) => {
    const paid = p.paidAmount || 0;
    const amount = parseFloat(p.amount);
    if (paid >= amount) return { text: '已付清', color: 'bg-green-100 text-green-800' };
    if (paid > 0) return { text: '部分付', color: 'bg-yellow-100 text-yellow-800' };
    return { text: '未付款', color: 'bg-red-100 text-red-800' };
  };

  const getInvoiceStatus = (p: any) => {
    const invoiced = p.invoicedAmount || 0;
    const amount = parseFloat(p.amount);
    if (invoiced >= amount) return { text: '已收票', color: 'bg-green-100 text-green-800' };
    if (invoiced > 0) return { text: '部分收票', color: 'bg-yellow-100 text-yellow-800' };
    return { text: '未收票', color: 'bg-red-100 text-red-800' };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">采购管理</h1>
        <div className="flex gap-2">
          {canExport && <ExportButton module="purchases" moduleName="采购" filter={{ projectId, supplierId, logisticsStatus }} />}
          {canEdit && (<><button onClick={() => setShowImportModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">📥 导入数据</button><button onClick={() => navigate('/purchases/new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ 新建采购</button></>)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">采购记录总数</p><p className="text-xl font-bold">{allPurchases.length} 笔</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">采购总金额</p><p className="text-xl font-bold text-blue-600">{formatAmount(summary.totalAmount)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">已收票金额</p><p className="text-xl font-bold text-green-600">{formatAmount(summary.totalInvoiced)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">涉及供应商数</p><p className="text-xl font-bold">{summary.uniqueSuppliers} 家</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">未付款总额</p><p className="text-xl font-bold text-red-600">{formatAmount(summary.totalAmount - summary.totalPaid)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">未收票总额</p><p className="text-xl font-bold text-orange-600">{formatAmount(summary.totalAmount - summary.totalInvoiced)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-gray-500 text-sm">已收票未付款</p><p className="text-xl font-bold text-yellow-600">{formatAmount(summary.totalInvoiced - summary.totalPaid)}</p></div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input type="text" placeholder="搜索采购内容、项目名称、供应商..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg" />
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">全部项目</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">全部供应商</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select value={logisticsStatus} onChange={(e) => setLogisticsStatus(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">全部物流状态</option><option value="arrived">已到货</option><option value="ordered">已下单</option><option value="pending">待发货</option></select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">全部付款状态</option><option value="paid">已付清</option><option value="partial">部分付</option><option value="unpaid">未付款</option></select>
        <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">全部收票状态</option><option value="invoiced">已收票</option><option value="partial">部分收票</option><option value="uninvoiced">未收票</option></select>
      </div>

      {loading ? <div className="text-center py-12">加载中...</div> : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[1100px]"><thead className="bg-gray-50"> transduction
              <th className="px-4 py-3 text-left">采购日期</th><th className="px-4 py-3 text-left">采购编号</th><th className="px-4 py-3 text-left">采购内容</th>
              <th className="px-4 py-3 text-left">所属项目</th><th className="px-4 py-3 text-left">供应商</th><th className="px-4 py-3 text-right">金额</th>
              <th className="px-4 py-3 text-center">物流</th><th className="px-4 py-3 text-center">付款</th><th className="px-4 py-3 text-center">收票</th><th className="px-4 py-3 text-center">操作</th>
            </thead>
              <tbody className="divide-y">
                {currentPageData.map(p => {
                  const payment = getPaymentStatus(p);
                  const invoice = getInvoiceStatus(p);
                  return (<tr key={p.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-sm">{new Date(p.purchase_date).toLocaleDateString()} </td>
                    <td className="px-4 py-3"><Link to={`/purchases/${p.id}`} className="text-blue-600 hover:underline">{p.purchase_no}</Link></td>
                    <td className="px-4 py-3 text-sm max-w-[200px] truncate">{p.content}</td>
                    <td className="px-4 py-3 text-sm">{p.projects?.name || p.project_id || '-'}</td>
                    <td className="px-4 py-3 text-sm">{p.suppliers?.name || p.supplier_id || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatAmount(parseFloat(p.amount))}</td>
                    <td className="px-4 py-3 text-center"><span className="px-2 py-1 rounded-full text-xs bg-blue-100">{statusMap[p.logistics_status]}</span></td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs ${payment.color}`}>{payment.text}</span></td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs ${invoice.color}`}>{invoice.text}</span></td>
                    <td className="px-4 py-3 text-center"><div className="flex justify-center gap-2"><Link to={`/purchases/${p.id}`} className="text-blue-600 text-sm">查看</Link>{canEdit && <Link to={`/purchases/${p.id}/edit`} className="text-blue-600 text-sm">编辑</Link>}{user?.role === 'admin' && <button onClick={() => handleDelete(p.id, p.content)} className="text-red-600 text-sm">删除</button>}</div></td>
                   </tr>);
                })}
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
      <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={() => { loadAllPurchases(); setShowImportModal(false); }} module="purchases" moduleName="采购" />
    </div>
  );
}