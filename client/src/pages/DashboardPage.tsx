import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalProjects: 0,
    ongoingProjects: 0,
    completedProjects: 0,
    suspendedProjects: 0,
    planningProjects: 0,
    pendingPaymentProjects: 0,
    ongoingAmount: 0,
    totalPurchaseAmount: 0,
    totalPaidAmount: 0,
    totalReceiptAmount: 0,
    totalContractAmount: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // 1. 项目统计
        const { data: projects } = await supabase.from('projects').select('status, contract_amount');
        if (projects) {
          const total = projects.length;
          const ongoing = projects.filter(p => p.status === 'ongoing').length;
          const completed = projects.filter(p => p.status === 'completed').length;
          const suspended = projects.filter(p => p.status === 'suspended').length;
          const planning = projects.filter(p => p.status === 'planning').length;
          const pendingPayment = projects.filter(p => p.status === 'pending_payment').length;
          const ongoingAmount = projects
            .filter(p => p.status === 'ongoing')
            .reduce((sum, p) => sum + (parseFloat(p.contract_amount) || 0), 0);
          const totalContract = projects.reduce((sum, p) => sum + (parseFloat(p.contract_amount) || 0), 0);
          setStats(prev => ({ ...prev, totalProjects: total, ongoingProjects: ongoing, completedProjects: completed, suspendedProjects: suspended, planningProjects: planning, pendingPaymentProjects: pendingPayment, ongoingAmount, totalContractAmount: totalContract }));
        }

        // 2. 采购统计
        const { data: purchases } = await supabase.from('purchases').select('amount');
        const totalPurchase = purchases?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;

        // 3. 收付款统计
        const { data: transactions } = await supabase.from('transactions').select('type, amount, project_id');
                
        // 应付款：关联采购的付款
        const payments = transactions?.filter(t => t.type === 'payment' && t.purchase_id) || [];
        const totalPaid = payments.reduce((sum, p) => sum + Math.abs(parseFloat(p.amount)), 0);

         // 应收款：关联项目的收款
        const receipts = transactions?.filter(t => t.type === 'receipt' && t.project_id) || [];
        const totalReceipt = receipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        
        // 更新 stats
       setStats(prev => ({ 
         ...prev, 
         totalPurchaseAmount: totalPurchase, 
         totalPaidAmount: totalPaid, 
         totalReceiptAmount: totalReceipt 
        }));

        // 4. 近期收付款
        const { data: recentTx } = await supabase.from('transactions').select('*, projects(name)').order('date', { ascending: false }).limit(5);
        if (recentTx) setRecentTransactions(recentTx.map(tx => ({ ...tx, project_name: tx.projects?.name })));

        // 5. 近期发票
        const { data: recentInv } = await supabase.from('invoices').select('*, suppliers(name)').order('invoice_date', { ascending: false }).limit(5);
        if (recentInv) setRecentInvoices(recentInv.map(inv => ({ ...inv, supplier_name: inv.suppliers?.name })));

      } catch (error) {
        console.error('加载仪表盘数据失败', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const formatAmount = (amount) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  const unpaidPurchase = stats.totalPurchaseAmount - stats.totalPaidAmount;
  const unpaidReceipt = stats.totalContractAmount - stats.totalReceiptAmount;

  if (loading) return <div className="flex justify-center py-12"><div className="text-gray-500">加载中...</div></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>
        <p className="text-gray-500 mt-1">欢迎回来，{user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6"><p className="text-gray-500 text-sm">项目总数</p><p className="text-2xl font-bold text-gray-800">{stats.totalProjects}</p></div>
        <div className="bg-white rounded-lg shadow p-6"><p className="text-gray-500 text-sm">在途项目金额</p><p className="text-2xl font-bold text-gray-800">{formatAmount(stats.ongoingAmount)}</p></div>
        <div className="bg-white rounded-lg shadow p-6"><p className="text-gray-500 text-sm">应付款总额</p><p className="text-2xl font-bold text-red-600">{formatAmount(unpaidPurchase)}</p></div>
        <div className="bg-white rounded-lg shadow p-6"><p className="text-gray-500 text-sm">应收款总额</p><p className="text-2xl font-bold text-green-600">{formatAmount(unpaidReceipt)}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">项目状态分布</h2>
          <div className="space-y-2">
            <div className="flex justify-between"><span>规划中</span><span>{stats.planningProjects} 个</span></div>
            <div className="flex justify-between"><span>进行中</span><span>{stats.ongoingProjects} 个</span></div>
            <div className="flex justify-between"><span>已完成</span><span>{stats.completedProjects} 个</span></div>
            <div className="flex justify-between"><span>未收齐</span><span>{stats.pendingPaymentProjects} 个</span></div>
            <div className="flex justify-between"><span>已暂停</span><span>{stats.suspendedProjects} 个</span></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">待办提醒</h2>
          <div className="p-3 bg-red-50 rounded mb-3"><p className="text-red-600">待付款提醒</p><p>{formatAmount(unpaidPurchase)}</p></div>
          <div className="p-3 bg-yellow-50 rounded"><p className="text-yellow-600">待收款提醒</p><p>{formatAmount(unpaidReceipt)}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold">近期收付款动态</h2><Link to="/transactions" className="text-blue-600 text-sm">查看全部 →</Link></div>
          {recentTransactions.map(tx => (<div key={tx.id} className="flex justify-between py-2 border-b"><div><p>{tx.project_name || '项目'}</p><p className="text-sm text-gray-500">{new Date(tx.date).toLocaleDateString()}</p></div><div className={tx.type === 'receipt' ? 'text-green-600' : 'text-red-600'}>{tx.type === 'receipt' ? '+' : '-'}{formatAmount(Math.abs(tx.amount))}</div></div>))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold">近期发票动态</h2><Link to="/invoices" className="text-blue-600 text-sm">查看全部 →</Link></div>
          {recentInvoices.map(inv => (<div key={inv.id} className="flex justify-between py-2 border-b"><div><p>{inv.invoice_no}</p><p className="text-sm text-gray-500">{inv.supplier_name} · {new Date(inv.invoice_date).toLocaleDateString()}</p></div><div className="text-right"><p>{formatAmount(inv.total_amount)}</p><p className="text-xs">{inv.status === 'paid' ? '已付款' : '未付款'}</p></div></div>))}
        </div>
      </div>
    </div>
  );
}