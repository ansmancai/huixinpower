import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../api/client';

interface Project {
  id: string;
  name: string;
  code: string;
  contract_amount: number;
  receivedAmount: number;
  invoicedAmount: number;
  purchaseTotal: number;
  purchasePaid: number;
}

export default function ProjectSearch() {
  const [keyword, setKeyword] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const requestIdRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 20;

  const loadProjects = useCallback(async (reset: boolean = false) => {
    const currentRequestId = ++requestIdRef.current;
    if (loading) return;
    setLoading(true);

    try {
      const currentPage = reset ? 0 : page;
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('projects')
        .select('*')
        .range(from, to)
        .order('created_at', { ascending: false });

      if (keyword && keyword.trim() !== '') {
        query = query.or(`name.ilike.%${keyword}%,code.ilike.%${keyword}%,client.ilike.%${keyword}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (currentRequestId !== requestIdRef.current) return;

      const projectIds = data?.map(p => p.id) || [];
      
      let receiptMap: Record<string, number> = {};
      if (projectIds.length > 0) {
        const { data: receipts } = await supabase
          .from('transactions')
          .select('project_id, amount')
          .eq('type', 'receipt')
          .in('project_id', projectIds);
        
        receipts?.forEach(r => {
          receiptMap[r.project_id] = (receiptMap[r.project_id] || 0) + parseFloat(r.amount);
        });
      }
      
      let invoiceMap: Record<string, number> = {};
      if (projectIds.length > 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('project_id, total_amount')
          .eq('type', 'output')
          .in('project_id', projectIds);
        
        invoices?.forEach(i => {
          invoiceMap[i.project_id] = (invoiceMap[i.project_id] || 0) + parseFloat(i.total_amount);
        });
      }
      
      let purchaseTotalMap: Record<string, number> = {};
      let purchasePaidMap: Record<string, number> = {};
      if (projectIds.length > 0) {
        const { data: purchases } = await supabase
          .from('purchases')
          .select('id, project_id, amount')
          .in('project_id', projectIds);
        
        const purchaseIds = purchases?.map(p => p.id) || [];
        purchases?.forEach(p => {
          purchaseTotalMap[p.project_id] = (purchaseTotalMap[p.project_id] || 0) + parseFloat(p.amount);
        });
        
        if (purchaseIds.length > 0) {
          const { data: payments } = await supabase
            .from('transactions')
            .select('purchase_id, amount')
            .eq('type', 'payment')
            .in('purchase_id', purchaseIds);
          
          const paidPerPurchase: Record<string, number> = {};
          payments?.forEach(p => {
            paidPerPurchase[p.purchase_id] = (paidPerPurchase[p.purchase_id] || 0) + Math.abs(parseFloat(p.amount));
          });
          
          purchases?.forEach(p => {
            purchasePaidMap[p.project_id] = (purchasePaidMap[p.project_id] || 0) + (paidPerPurchase[p.id] || 0);
          });
        }
      }

      const formattedData = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        contract_amount: parseFloat(p.contract_amount) || 0,
        receivedAmount: receiptMap[p.id] || 0,
        invoicedAmount: invoiceMap[p.id] || 0,
        purchaseTotal: purchaseTotalMap[p.id] || 0,
        purchasePaid: purchasePaidMap[p.id] || 0,
      }));

      if (reset) {
        setProjects(formattedData);
        setPage(1);
      } else {
        setProjects(prev => [...prev, ...formattedData]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(formattedData.length === pageSize);
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
    setProjects([]);
    setPage(0);
    setHasMore(true);
    loadProjects(true);
  }, [keyword]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadProjects();
      }
    });
    
    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, projects.length]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4">项目查询</h1>
      
      <input
        type="text"
        placeholder="搜索项目名称、编号、甲方..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="w-full px-4 py-3 border rounded-lg text-base mb-4"
        autoFocus
      />

      <div className="space-y-3">
        {projects.map((p, index) => {
          const unpaidReceipt = p.contract_amount - p.receivedAmount;
          const uninvoiced = p.contract_amount - p.invoicedAmount;
          const unpaidPurchase = p.purchaseTotal - p.purchasePaid;
          
          return (
            <div
              key={p.id}
              ref={index === projects.length - 1 ? lastElementRef : null}
              className="bg-white rounded-lg shadow p-4"
            >
              <div className="mb-2">
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500">{p.code}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">合同金额：</span>
                  <span className="font-medium">{formatAmount(p.contract_amount)}</span>
                </div>
                <div>
                  <span className="text-gray-500">未收款：</span>
                  <span className="text-red-600">{formatAmount(unpaidReceipt)}</span>
                </div>
                <div>
                  <span className="text-gray-500">未开票：</span>
                  <span className="text-orange-600">{formatAmount(uninvoiced)}</span>
                </div>
                <div>
                  <span className="text-gray-500">采购总额：</span>
                  <span>{formatAmount(p.purchaseTotal)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">采购未付款：</span>
                  <span className="text-red-600">{formatAmount(unpaidPurchase)}</span>
                </div>
              </div>
            </div>
          );
        })}
        
        {loading && <div className="text-center py-4 text-gray-500">加载中...</div>}
        {!loading && projects.length === 0 && keyword && <div className="text-center py-8 text-gray-500">没有找到相关项目</div>}
        {!loading && !hasMore && projects.length > 0 && <div className="text-center py-4 text-gray-400 text-sm">没有更多了</div>}
      </div>
    </div>
  );
}