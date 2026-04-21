import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../api/client';

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  payment_method: string;
  project_name: string;
  supplier_name: string;
  remark: string;
}

export default function TransactionSearch() {
  const [keyword, setKeyword] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'receipt' | 'payment'>('all');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const requestIdRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 20;

  const loadTransactions = useCallback(async (reset: boolean = false, searchKeyword: string = keyword, searchFilter: string = filterType) => {
    const currentRequestId = ++requestIdRef.current;
    
    if (loading && !reset) return;
    setLoading(true);

    try {
      let projectIds: string[] = [];
      let supplierIds: string[] = [];
      
      if (searchKeyword && searchKeyword.trim() !== '') {
        const { data: matchedProjects } = await supabase
          .from('projects')
          .select('id')
          .ilike('name', `%${searchKeyword}%`);
        projectIds = matchedProjects?.map(p => p.id) || [];
        
        const { data: matchedSuppliers } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', `%${searchKeyword}%`);
        supplierIds = matchedSuppliers?.map(s => s.id) || [];
      }

      const currentPage = reset ? 0 : page;
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('transactions')
        .select('*, projects(name), suppliers(name)')
        .range(from, to)
        .order('date', { ascending: false });

      if (searchFilter !== 'all') {
        query = query.eq('type', searchFilter);
      }

      if (searchKeyword && searchKeyword.trim() !== '') {
        const conditions = [`remark.ilike.%${searchKeyword}%`, `payment_method.ilike.%${searchKeyword}%`];
        if (projectIds.length > 0) {
          conditions.push(`project_id.in.(${projectIds.join(',')})`);
        }
        if (supplierIds.length > 0) {
          conditions.push(`supplier_id.in.(${supplierIds.join(',')})`);
        }
        query = query.or(conditions.join(','));
      }

      const { data, error } = await query;
      if (error) throw error;

      if (currentRequestId !== requestIdRef.current) return;

      const formattedData = (data || []).map(t => ({
        id: t.id,
        date: t.date,
        type: t.type,
        amount: parseFloat(t.amount),
        payment_method: t.payment_method,
        project_name: t.projects?.name || '-',
        supplier_name: t.suppliers?.name || '-',
        remark: t.remark || '',
      }));

      if (reset) {
        setTransactions(formattedData);
        setPage(1);
      } else {
        setTransactions(prev => [...prev, ...formattedData]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(formattedData.length === pageSize);
      setInitialLoaded(true);
    } catch (error) {
      if (currentRequestId === requestIdRef.current) {
        console.error('加载失败', error);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [keyword, page, loading, filterType]);

  useEffect(() => {
    if (!initialLoaded && keyword === '' && filterType === 'all') return;
    
    setTransactions([]);
    setPage(0);
    setHasMore(true);
    loadTransactions(true, keyword, filterType);
  }, [keyword, filterType]);

  useEffect(() => {
    if (!initialLoaded) {
      loadTransactions(true, '', 'all');
    }
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading && initialLoaded) {
        loadTransactions(false, keyword, filterType);
      }
    });
    
    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, initialLoaded, transactions.length]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    const map: Record<string, string> = {
      bank: '银行转账',
      cash: '现金',
      wechat: '微信',
      alipay: '支付宝',
      draft: '汇票',
      check: '支票',
      other: '其他',
    };
    return map[method] || method;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-4">
      <h1 className="text-xl font-bold mb-4">收付款查询</h1>
      
      <div className="flex gap-2 mb-3 sm:mb-4">
  <input
    type="text"
    placeholder="搜索备注、项目、供应商..."
    value={keyword}
    onChange={(e) => setKeyword(e.target.value)}
    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border rounded-lg text-sm sm:text-base"
    autoFocus
  />
  <select
    value={filterType}
    onChange={(e) => setFilterType(e.target.value as any)}
    className="px-3 sm:px-4 py-2 sm:py-3 border rounded-lg bg-white text-sm sm:text-base"
  >
    <option value="all">全部</option>
    <option value="receipt">收款</option>
    <option value="payment">付款</option>
  </select>
</div>

      <div className="space-y-3">
        {transactions.map((t, index) => (
          <div
            key={t.id}
            ref={index === transactions.length - 1 ? lastElementRef : null}
            className="bg-white rounded-lg shadow p-3 sm:p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">{getPaymentMethodLabel(t.payment_method)}</p>
              </div>
              <div className={`text-right ${t.type === 'receipt' ? 'text-green-600' : 'text-red-600'}`}>
                <p className="font-bold text-lg">{t.type === 'receipt' ? '+' : '-'}{formatAmount(Math.abs(t.amount))}</p>
                <p className="text-xs">{t.type === 'receipt' ? '收款' : '付款'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
              <div>
                <span className="text-gray-500">项目：</span>
                <span className="text-gray-700">{t.project_name}</span>
              </div>
              <div>
                <span className="text-gray-500">供应商：</span>
                <span className="text-gray-700">{t.supplier_name}</span>
              </div>
            </div>
            
            {t.remark && (
              <div className="mt-2 text-xs text-gray-400">
                备注：{t.remark}
              </div>
            )}
          </div>
        ))}
        
        {loading && <div className="text-center py-4 text-gray-500">加载中...</div>}
        {!loading && transactions.length === 0 && (keyword || filterType !== 'all') && (
          <div className="text-center py-8 text-gray-500">没有找到相关记录</div>
        )}
        {!loading && !hasMore && transactions.length > 0 && <div className="text-center py-4 text-gray-400 text-sm">没有更多了</div>}
      </div>
    </div>
  );
}