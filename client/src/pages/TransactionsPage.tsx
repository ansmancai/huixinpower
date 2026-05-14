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

  // 从 URL 读取参数并恢复状态
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pageParam = params.get('page');
    const keywordParam = params.get('keyword');
    const typeParam = params.get('type');
    const projectIdParam = params.get('projectId');
    const supplierIdParam = params.get('supplierId');
    
    if (pageParam) setPage(parseInt(pageParam));
    if (keywordParam) setKeyword(keywordParam);
    if (typeParam && typeParam !== 'all') setType(typeParam);
    if (projectIdParam && projectIdParam !== 'all') setProjectId(projectIdParam);
    if (supplierIdParam && supplierIdParam !== 'all') setSupplierId(supplierIdParam);
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
      
      if (keyword) {
        baseQuery = baseQuery.or(
    `remark.ilike.%${keyword}%,receipt_no.ilike.%${keyword}%,` +
    `projects.name.ilike.%${keyword}%,suppliers.name.ilike.%${keyword}%`
    );
      }
      if (type !== 'all') baseQuery = baseQuery.eq('type', type);
      if (projectId !== 'all') baseQuery = baseQuery.eq('project_id', projectId);
      if (supplierId !== 'all') baseQuery = baseQuery.eq('supplier_id', supplierId);
      
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
  }, [page, type, projectId, supplierId, keyword]);

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
    const queryString = params.toString();
    return `/transactions/${id}${queryString ? `?${queryString}` : ''}`;
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

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="搜索备注、编号、项目、供应商..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="all">全部类型</option>
          <option value="payment">付款</option>
          <option value="receipt">收款</option>
        </select>
        
        {/* 项目下拉框 - 带搜索功能 */}
        <div className="w-64">
          <SearchSelect
            value={projectId}
            onChange={(val) => setProjectId(val || 'all')}
            onSearch={searchProjects}
            placeholder="选择项目"
            displayName={selectedProjectName}
          />
        </div>
        
        {/* 供应商下拉框 - 带搜索功能 */}
        <div className="w-64">
          <SearchSelect
            value={supplierId}
            onChange={(val) => setSupplierId(val || 'all')} 
            onSearch={searchSuppliers}
            placeholder="选择供应商"
            displayName={selectedSupplierName}
          />
        </div>
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
                  <th className="px-4 py-3 text-left">供应商</th>
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
                    <td className="px-4 py-3 text-sm">{t.suppliers?.name || '-'}</td>
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