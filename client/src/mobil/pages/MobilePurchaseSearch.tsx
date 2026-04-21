import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../api/client';

interface Purchase {
  id: string;
  purchase_no: string;
  content: string;
  amount: number;
  paidAmount: number;
  project_name: string;
  supplier_name: string;
  logistics_status: string;
  purchase_date: string;
}

export default function MobilePurchaseSearch() {
  const [keyword, setKeyword] = useState('');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 20;

  const loadPurchases = useCallback(async (reset: boolean = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const currentPage = reset ? 0 : page;
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;

      // 搜索匹配的项目ID和供应商ID
      let projectIds: string[] = [];
      let supplierIds: string[] = [];
      
      if (keyword) {
        const { data: matchedProjects } = await supabase
          .from('projects')
          .select('id')
          .ilike('name', `%${keyword}%`);
        projectIds = matchedProjects?.map(p => p.id) || [];
        
        const { data: matchedSuppliers } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', `%${keyword}%`);
        supplierIds = matchedSuppliers?.map(s => s.id) || [];
      }

      let query = supabase
        .from('purchases')
        .select('*, projects(name), suppliers(name)', { count: 'exact' })
        .range(from, to)
        .order('purchase_date', { ascending: false });

      if (keyword) {
        const conditions = [`content.ilike.%${keyword}%`];
        if (projectIds.length) conditions.push(`project_id.in.(${projectIds.join(',')})`);
        if (supplierIds.length) conditions.push(`supplier_id.in.(${supplierIds.join(',')})`);
        query = query.or(conditions.join(','));
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // 获取付款金额
      const purchaseIds = data?.map(p => p.id) || [];
      if (purchaseIds.length) {
        const { data: payments } = await supabase
          .from('transactions')
          .select('purchase_id, amount')
          .eq('type', 'payment')
          .in('purchase_id', purchaseIds);
        
        const paidMap: Record<string, number> = {};
        payments?.forEach(p => {
          paidMap[p.purchase_id] = (paidMap[p.purchase_id] || 0) + Math.abs(parseFloat(p.amount));
        });
        
        data?.forEach(p => {
          p.paidAmount = paidMap[p.id] || 0;
        });
      }

      const formattedData = (data || []).map(p => ({
        id: p.id,
        purchase_no: p.purchase_no,
        content: p.content,
        amount: parseFloat(p.amount),
        paidAmount: p.paidAmount || 0,
        project_name: p.projects?.name || '-',
        supplier_name: p.suppliers?.name || '-',
        logistics_status: p.logistics_status,
        purchase_date: p.purchase_date,
      }));

      if (reset) {
        setPurchases(formattedData);
        setPage(1);
      } else {
        setPurchases(prev => [...prev, ...formattedData]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(formattedData.length === pageSize);
    } catch (error) {
      console.error('加载失败', error);
    } finally {
      setLoading(false);
    }
  }, [keyword, page, loading]);

  // 搜索时重置
  useEffect(() => {
    setPurchases([]);
    setPage(0);
    setHasMore(true);
    loadPurchases(true);
  }, [keyword]);

  // 滚动加载更多
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadPurchases();
      }
    });
    
    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, purchases.length]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  const statusMap: Record<string, string> = {
    arrived: '已到货',
    ordered: '已下单',
    pending: '待发货',
  };

  const getPaymentStatus = (p: Purchase) => {
    const unpaid = p.amount - p.paidAmount;
    if (unpaid <= 0) return { text: '已付清', color: 'text-green-600' };
    if (p.paidAmount > 0) return { text: '部分付', color: 'text-yellow-600' };
    return { text: '未付款', color: 'text-red-600' };
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">采购查询</h1>
      
      {/* 搜索框 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索采购内容、项目名称、供应商..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg text-base"
          autoFocus
        />
      </div>

      {/* 结果列表 */}
      <div className="space-y-3">
        {purchases.map((p, index) => {
          const paymentStatus = getPaymentStatus(p);
          const unpaid = p.amount - p.paidAmount;
          return (
            <div
              key={p.id}
              ref={index === purchases.length - 1 ? lastElementRef : null}
              className="bg-white rounded-lg shadow p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{p.content}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.purchase_no}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatAmount(p.amount)}</p>
                  <p className={`text-xs font-medium ${paymentStatus.color}`}>
                    {paymentStatus.text} {unpaid > 0 ? `(${formatAmount(unpaid)})` : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-gray-500">项目：</span>
                  <span className="text-gray-700">{p.project_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">供应商：</span>
                  <span className="text-gray-700">{p.supplier_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">采购日期：</span>
                  <span className="text-gray-700">{new Date(p.purchase_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">物流：</span>
                  <span className="text-gray-700">{statusMap[p.logistics_status] || p.logistics_status}</span>
                </div>
              </div>
            </div>
          );
        })}
        
        {loading && (
          <div className="text-center py-4 text-gray-500">加载中...</div>
        )}
        
        {!loading && purchases.length === 0 && keyword && (
          <div className="text-center py-8 text-gray-500">没有找到相关采购记录</div>
        )}
        
        {!loading && !hasMore && purchases.length > 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">没有更多了</div>
        )}
      </div>
    </div>
  );
}