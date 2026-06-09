import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import ExportButton from '../components/ExportButton';
import ImportModal from '../components/ImportModal';
import SearchSelect from '../components/SearchSelect';

export default function TransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('all');
  const [projectId, setProjectId] = useState('all');
  const [supplierId, setSupplierId] = useState('all');
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  
  // 日期范围筛选
  const getDefaultDateFrom = () => {
    const today = new Date();
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return firstDayOfLastMonth.toISOString().split('T')[0];
  };
  const getDefaultDateTo = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState(getDefaultDateTo());
  
  const pageSize = 20;

  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const canExport = user?.role === 'admin' || user?.role === 'finance';

  // 支付方式映射表
  const paymentMethodMap: Record<string, string> = {
    bank: '银行转账',
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    draft: '汇票',
    check: '支票',
    other: '其他',
  };

  // 重置所有筛选条件
  const resetFilters = () => {
    setPage(1);
    setKeyword('');
    setType('all');
    setProjectId('all');
    setSupplierId('all');
    setDateFrom(getDefaultDateFrom());
    setDateTo(getDefaultDateTo());
    setSelectedProjectName('');
    setSelectedSupplierName('');
  };

  // 从 URL 读取参数并恢复状态
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pageParam = params.get('page');
    const keywordParam = params.get('keyword');
    const typeParam = params.get('type');
    const projectIdParam = params.get('projectId');
    const supplierIdParam = params.get('supplierId');
    const dateFromParam = params.get('dateFrom');
    const dateToParam = params.get('dateTo');
    
    if (pageParam) setPage(parseInt(pageParam));
    if (keywordParam) setKeyword(keywordParam);
    if (typeParam && typeParam !== 'all') setType(typeParam);
    if (projectIdParam && projectIdParam !== 'all') setProjectId(projectIdParam);
    if (supplierIdParam && supplierIdParam !== 'all') setSupplierId(supplierIdParam);
    if (dateFromParam) setDateFrom(dateFromParam);
    if (dateToParam) setDateTo(dateToParam);
  }, [location.search]);

  // 搜索项目
  const searchProjects = async (searchKeyword: string) => {
    if (!searchKeyword) return [];
    const { data } = await supabase
      .from('projects')
      .select('id, name, code')
      .ilike('name', `%${searchKeyword}%`)
      .limit(20);
    return data || [];
  };

  // 搜索供应商
  const searchSuppliers = async (searchKeyword: string) => {
    if (!searchKeyword) return [];
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, code')
      .ilike('name', `%${searchKeyword}%`)
      .limit(20);
    return data || [];
  };

  // 加载项目名称（用于回显）
  useEffect(() => {
    const loadProjectName = async () => {
      if (projectId && projectId !== 'all') {
        const { data } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();
        if (data) setSelectedProjectName(data.name);
      } else {
        setSelectedProjectName('');
      }
    };
    loadProjectName();
  }, [projectId]);

  // 加载供应商名称（用于回显）
  useEffect(() => {
    const loadSupplierName = async () => {
      if (supplierId && supplierId !== 'all') {
        const { data } = await supabase
          .from('suppliers')
          .select('name')
          .eq('id', supplierId)
          .single();
        if (data) setSelectedSupplierName(data.name);
      } else {
        setSelectedSupplierName('');
      }
    };
    loadSupplierName();
  }, [supplierId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      let baseQuery = supabase.from('transactions').select('*, projects(name), suppliers(name)', { count: 'exact' });
      
      // 关键字搜索（只搜索 transactions 表自身字段）
      if (keyword) {
        // 搜索项目名称匹配的项目ID
        const { data: matchedProjects } = await supabase
          .from('projects')
          .select('id')
          .ilike('name', `%${keyword}%`);
        const projectIds = matchedProjects?.map(p => p.id) || [];
        
        // 搜索供应商名称匹配的供应商ID
        const { data: matchedSuppliers } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', `%${keyword}%`);
        const supplierIds = matchedSuppliers?.map(s => s.id) || [];
        
        // 构建 OR 条件
        const conditions = [`remark.ilike.%${keyword}%`, `receipt_no.ilike.%${keyword}%`, `counterparty_name.ilike.%${keyword}%`];
        if (projectIds.length) conditions.push(`project_id.in.(${projectIds.join(',')})`);
        if (supplierIds.length) conditions.push(`supplier_id.in.(${supplierIds.join(',')})`);
        
        baseQuery = baseQuery.or(conditions.join(','));
      }
      
      if (type !== 'all') baseQuery = baseQuery.eq('type', type);
      if (projectId !== 'all') baseQuery = baseQuery.eq('project_id', projectId);
      if (supplierId !== 'all') baseQuery = baseQuery.eq('supplier_id', supplierId);
      
      // 日期范围筛选
      if (dateFrom) baseQuery = baseQuery.gte('date', dateFrom);
      if (dateTo) baseQuery = baseQuery.lte('date', dateTo);
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count } = await baseQuery.range(from, to).order('date', { ascending: false });
      
      setTransactions(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('加载交易记录失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [page, type, projectId, supplierId, keyword, dateFrom, dateTo]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除吗？')) return;
    try {
      await supabase.from('transactions').delete().eq('id', id);
      loadTransactions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  const totalPages = Math.ceil(total / pageSize);

  // 构建带参数的详情页链接
  const getDetailUrl = (id: string) => {
    const params = new URLSearchParams();
    if (page !== 1) params.set('page', page.toString());
    if (keyword) params.set('keyword', keyword);
    if (type !== 'all') params.set('type', type);
    if (projectId !== 'all') params.set('projectId', projectId);
    if (supplierId !== 'all') params.set('supplierId', supplierId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const queryString = params.toString();
    return `/transactions/${id}${queryString ? `?${queryString}` : ''}`;
  };

  // 获取对方名称显示值
  const getCounterpartyName = (t: any) => {
    if (t.type === 'payment') {
      return t.suppliers?.name || '-';
    } else {
      return t.counterparty_name || '-';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">收付款记录</h1>
        <div className="flex gap-2">
          {canExport && <ExportButton module="transactions" moduleName="收付款" filter={{ type, projectId, supplierId }} />}
          {canEdit && (
            <button
              onClick={() => navigate('/transactions/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + 新建收付款
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-gray-500 mb-1">搜索</label>
          <input
            type="text"
            placeholder="搜索备注、编号、付款方..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-500 mb-1">类型</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border rounded-lg w-32">
            <option value="all">全部</option>
            <option value="payment">付款</option>
            <option value="receipt">收款</option>
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
        
        <div className="w-64">
          <label className="block text-sm text-gray-500 mb-1">项目</label>
          <SearchSelect
            value={projectId}
            onChange={(val) => setProjectId(val || 'all')}
            onSearch={searchProjects}
            placeholder="全部项目"
            displayName={selectedProjectName}
          />
        </div>
        
        <div className="w-64">
          <label className="block text-sm text-gray-500 mb-1">供应商</label>
          <SearchSelect
            value={supplierId}
            onChange={(val) => setSupplierId(val || 'all')} 
            onSearch={searchSuppliers}
            placeholder="全部供应商"
            displayName={selectedSupplierName}
          />
        </div>
        
        <button
          onClick={resetFilters}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
        >
          重置筛选
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">编号</th>
                  <th className="px-4 py-3 text-left">日期</th>
                  <th className="px-4 py-3 text-left">类型</th>
                  <th className="px-4 py-3 text-right">金额</th>
                  <th className="px-4 py-3 text-left">支付方式</th>
                  <th className="px-4 py-3 text-left">项目</th>
                  <th className="px-4 py-3 text-left">对方名称</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link to={getDetailUrl(t.id)} className="text-blue-600 hover:underline">
                        {t.receipt_no || t.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={t.type === 'payment' ? 'text-red-600' : 'text-green-600'}>
                        {t.type === 'payment' ? '付款' : '收款'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={t.type === 'payment' ? 'text-red-600' : 'text-green-600'}>
                        {formatAmount(Math.abs(parseFloat(t.amount)))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {paymentMethodMap[t.payment_method] || t.payment_method}
                    </td>
                    <td className="px-4 py-3 text-sm">{t.projects?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{getCounterpartyName(t)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Link to={getDetailUrl(t.id)} className="text-blue-600 text-sm">查看</Link>
                        {canEdit && <Link to={`/transactions/${t.id}/edit`} className="text-blue-600 text-sm">编辑</Link>}
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(t.id)} className="text-red-600 text-sm">删除</button>
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