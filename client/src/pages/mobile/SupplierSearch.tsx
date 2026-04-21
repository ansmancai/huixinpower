import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../api/client';

interface Supplier {
  id: string;
  code: string;
  name: string;
  bank: string;
  account: string;
  purchaseTotal: number;
  paidTotal: number;
  unpaidPurchases: any[];
}

export default function SupplierSearch() {
  const [keyword, setKeyword] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const requestIdRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 20;

  const loadSuppliers = useCallback(async (reset: boolean = false, searchKeyword: string = keyword) => {
    const currentRequestId = ++requestIdRef.current;
    
    if (loading && !reset) return;
    setLoading(true);

    try {
      const currentPage = reset ? 0 : page;
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('suppliers')
        .select('*')
        .range(from, to)
        .order('name', { ascending: true });

      if (searchKeyword && searchKeyword.trim() !== '') {
        query = query.or(`name.ilike.%${searchKeyword}%,code.ilike.%${searchKeyword}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (currentRequestId !== requestIdRef.current) return;

      const supplierIds = data?.map(s => s.id) || [];
      
      let purchaseTotalMap: Record<string, number> = {};
      let purchasesBySupplier: Record<string, any[]> = {};
      
      if (supplierIds.length > 0) {
        const { data: purchases } = await supabase
          .from('purchases')
          .select('id, supplier_id, amount, content, purchase_no, project_id, projects(name)')
          .in('supplier_id', supplierIds);
        
        purchases?.forEach(p => {
          purchaseTotalMap[p.supplier_id] = (purchaseTotalMap[p.supplier_id] || 0) + parseFloat(p.amount);
          if (!purchasesBySupplier[p.supplier_id]) purchasesBySupplier[p.supplier_id] = [];
          purchasesBySupplier[p.supplier_id].push({
            ...p,
            amount: parseFloat(p.amount),
            project_name: p.projects?.name || '-'
          });
        });
        
        const purchaseIds = purchases?.map(p => p.id) || [];
        let paidPerPurchase: Record<string, number> = {};
        
        if (purchaseIds.length > 0) {
          const { data: payments } = await supabase
            .from('transactions')
            .select('purchase_id, amount')
            .eq('type', 'payment')
            .in('purchase_id', purchaseIds);
          
          payments?.forEach(p => {
            paidPerPurchase[p.purchase_id] = (paidPerPurchase[p.purchase_id] || 0) + Math.abs(parseFloat(p.amount));
          });
        }
        
        Object.keys(purchasesBySupplier).forEach(sid => {
          purchasesBySupplier[sid] = purchasesBySupplier[sid].filter(p => {
            const paid = paidPerPurchase[p.id] || 0;
            return p.amount > paid;
          }).map(p => ({
            id: p.id,
            content: p.content,
            purchase_no: p.purchase_no,
            amount: p.amount,
            paidAmount: paidPerPurchase[p.id] || 0,
            unpaid: p.amount - (paidPerPurchase[p.id] || 0),
            project_name: p.project_name
          }));
        });
      }
      
      let paidTotalMap: Record<string, number> = {};
      if (supplierIds.length > 0) {
        const { data: payments } = await supabase
          .from('transactions')
          .select('supplier_id, amount')
          .eq('type', 'payment')
          .in('supplier_id', supplierIds);
        
        payments?.forEach(p => {
          paidTotalMap[p.supplier_id] = (paidTotalMap[p.supplier_id] || 0) + Math.abs(parseFloat(p.amount));
        });
      }

      const formattedData = (data || []).map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        bank: s.bank || '-',
        account: s.account || '-',
        purchaseTotal: purchaseTotalMap[s.id] || 0,
        paidTotal: paidTotalMap[s.id] || 0,
        unpaidPurchases: purchasesBySupplier[s.id] || [],
      }));

      if (reset) {
        setSuppliers(formattedData);
        setPage(1);
      } else {
        setSuppliers(prev => [...prev, ...formattedData]);
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
  }, [keyword, page, loading]);

  useEffect(() => {
    if (!initialLoaded && keyword === '') return;
    
    setSuppliers([]);
    setPage(0);
    setHasMore(true);
    loadSuppliers(true, keyword);
  }, [keyword]);

  useEffect(() => {
    if (!initialLoaded) {
      loadSuppliers(true, '');
    }
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading && initialLoaded) {
        loadSuppliers(false, keyword);
      }
    });
    
    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, initialLoaded, suppliers.length]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-4">
      <h1 className="text-xl font-bold mb-4">供应商查询</h1>
      
      <input
        type="text"
        placeholder="搜索供应商名称、编号..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg text-sm sm:text-base mb-3 sm:mb-4"  
        autoFocus
      />

      <div className="space-y-3">
        {suppliers.map((s, index) => {
          const unpaidTotal = s.purchaseTotal - s.paidTotal;
          const isExpanded = expandedId === s.id;
          
          return (
            <div
              key={s.id}
              ref={index === suppliers.length - 1 ? lastElementRef : null}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              <div className="p-3 sm:p-4" onClick={() => toggleExpand(s.id)}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">采购总额</p>
                    <p className="font-bold text-blue-600">{formatAmount(s.purchaseTotal)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div>
                    <span className="text-gray-500">未付款：</span>
                    <span className="text-red-600 font-medium">{formatAmount(unpaidTotal)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">已付款：</span>
                    <span>{formatAmount(s.paidTotal)}</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>银行：{s.bank !== '-' ? s.bank.substring(0, 20) + '...' : '-'}</span>
                  <span>{isExpanded ? '▲ 收起' : '▼ 展开'}</span>
                </div>
              </div>
              
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-3 sm:p-4">
                  <div className="mb-3">
                    <p className="text-sm text-gray-500">开户行</p>
                    <p className="text-sm">{s.bank}</p>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm text-gray-500">账号</p>
                    <p className="text-sm font-mono">{s.account}</p>
                  </div>
                  
                  {s.unpaidPurchases.length > 0 && (
                    <div>
  <p className="text-sm font-medium text-gray-700 mb-2">未付清采购</p>
  <div className="space-y-2">
    {s.unpaidPurchases.map(p => (
      <div key={p.id} className="bg-white rounded p-2 sm:p-3 text-sm">
        <div className="flex justify-between">
          <div>
            <span className="text-gray-700">{p.content}</span>
            <div className="text-xs text-gray-400 mt-0.5">项目：{p.project_name}</div>
          </div>
          <span className="text-red-600 font-medium">{formatAmount(p.unpaid)}</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          采购金额：{formatAmount(p.amount)} | 已付：{formatAmount(p.paidAmount)}
        </div>
      </div>
    ))}
  </div>
</div>
                  )}
                  
                  {s.unpaidPurchases.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">暂无未付清采购</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {loading && <div className="text-center py-4 text-gray-500">加载中...</div>}
        {!loading && suppliers.length === 0 && keyword && <div className="text-center py-8 text-gray-500">没有找到相关供应商</div>}
        {!loading && !hasMore && suppliers.length > 0 && <div className="text-center py-4 text-gray-400 text-sm">没有更多了</div>}
      </div>
    </div>
  );
}