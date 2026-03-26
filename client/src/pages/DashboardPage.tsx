import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface Stats {
  totalProjects: number;
  ongoingProjects: number;
  completedProjects: number;
  suspendedProjects: number;
  planningProjects: number;
  pendingPaymentProjects: number;
  ongoingAmount: number;
  totalPurchaseAmount: number;
  totalPaidAmount: number;
  totalReceiptAmount: number;
  totalContractAmount: number;
}

interface RecentTransaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  payment_method: string;
  project_id: string;
  project_name?: string;
  remark: string;
}

interface RecentInvoice {
  id: string;
  invoice_no: string;
  type: string;
  total_amount: number;
  invoice_date: string;
  supplier_name?: string;
  status: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
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
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const { data: projects } = await supabase.from('projects').select('status, contract_amount');
        if (projects) {
          const total = projects.length;
          const ongoing = projects.filter(p => p.status === 'ongoing').length;
          const completed = projects.filter(p => p.status === 'completed').length;
          const suspended = projects.filter(p => p.status === 'suspended').length;
          const planning = projects.filter(p => p.status === 'planning').length;
          const pendingPayment = projects.filter(p => p.status === 'pending_payment').length;
          const ongoingAmount = projects.filter(p => p.status === 'ongoing')
            .reduce((sum, p) => sum + (parseFloat(p.contract_amount) || 0), 0);
          const totalContract = projects.reduce((sum, p) => sum + (parseFloat(p.contract_amount) || 0), 0);
          setStats(prev => ({ ...prev, totalProjects: total, ongoingProjects: ongoing, completedProjects: completed, suspendedProjects: suspended, planningProjects: planning, pendingPaymentProjects: pendingPayment, ongoingAmount, totalContractAmount: totalContract }));
        }

        const { data: purchases } = await supabase.from('purchases').select('amount');
        const totalPurchase = purchases?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
        
        const { data: transactions } = await supabase.from('transactions').select('type, amount');
        const totalPaid = transactions?.filter(t => t.type === 'payment').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0) || 0;
        const totalReceipt = transactions?.filter(t => t.type === 'receipt').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0;
        setStats(prev => ({ ...prev, totalPurchaseAmount: totalPurchase, totalPaidAmount: totalPaid, totalReceiptAmount: totalReceipt }));

        const { data: recentTx } = await supabase.from('transactions').select('*, projects(name)').order('date', { ascending: false }).limit(5);
        if (recentTx) setRecentTransactions(recentTx.map(tx => ({ ...tx, project_name: tx.projects?.name })));

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

  const formatAmount = (amount: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  const unpaidPurchase = stats.totalPurchaseAmount - stats.totalPaidAmount;
  const unpaidReceipt = stats.totalContractAmount - stats.totalReceiptAmount;

  const statCards = [
    { label: '项目总数', value: stats.totalProjects, icon: '📋', color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
    { label: '在途项目金额', value: formatAmount(stats.ongoingAmount), icon: '🚚', color: 'bg-orange-50 text-orange-600', border: 'border-orange-100' },
    { label: '应付款总额', value: formatAmount(unpaidPurchase), icon: '💸', color: 'bg-red-50 text-red-600', border: 'border-red-100' },
    { label: '应收款总额', value: formatAmount(unpaidReceipt), icon: '💰', color: 'bg-green-50 text-green-600', border: 'border-green-100' },
  ];

  const statusMap = {
    planning: { label: '规划中', color: 'bg-purple-100 text-purple-800' },
    ongoing: { label: '进行中', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
    pending_payment: { label: '未收齐', color: 'bg-yellow-100 text-yellow-800' },
    suspended: { label: '已暂停', color: 'bg-gray-100 text-gray-800' },
  };
  const statusCounts = {
    planning: stats.planningProjects, ongoing: stats.ongoingProjects, completed: stats.completedProjects,
    pending_payment: stats.pendingPaymentProjects, suspended: stats.suspendedProjects,
  };

  const paymentMethodMap: Record<string, string> = { bank: '银行转账', cash: '现金', wechat: '微信', alipay: '支付宝', draft: '汇票', check: '支票', other: '其他' };
  const invoiceTypeMap = { input: '进项', output: '销项' };
  const invoiceStatusMap = { unpaid: '未付款', partial: '部分付款', paid: '已付款', cancelled: '作废' };

  if (loading) return <div className="flex justify-center py-12"><div className="text-gray-500">加载中...</div></div>;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">仪表盘</h1>
        <p className="text-gray-500 text-sm mt-0.5">欢迎回来，{user?.name}</p>
      </div>

      {/* 统计卡片 - 紧凑版 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className={`bg-white rounded-lg shadow-sm border ${card.border} p-3 hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs mb-1">{card.label}</p>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
              </div>
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center text-base`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* 项目状态分布 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">项目状态分布</h2>
          <div className="space-y-2">
            {Object.entries(statusMap).map(([status, { label, color }]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-gray-600 text-xs">{label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color.replace('text', 'bg')}`} style={{ width: `${(statusCounts[status as keyof typeof statusCounts] / stats.totalProjects) * 100}%` }}></div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${color}`}>
                    {statusCounts[status as keyof typeof statusCounts]} 个
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 待办提醒 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">待办提醒</h2>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-red-600 font-medium text-xs">待付款提醒</p>
              <p className="text-red-500 text-base font-semibold mt-0.5">{formatAmount(unpaidPurchase)}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <p className="text-yellow-600 font-medium text-xs">待收款提醒</p>
              <p className="text-yellow-500 text-base font-semibold mt-0.5">{formatAmount(unpaidReceipt)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 近期收付款动态 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-700">近期收付款动态</h2>
            <Link to="/transactions" className="text-blue-600 text-xs hover:underline">查看全部 →</Link>
          </div>
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{tx.project_name || '项目'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(tx.date).toLocaleDateString()} · {paymentMethodMap[tx.payment_method] || tx.payment_method}
                    {tx.remark && ` · ${tx.remark.slice(0, 25)}`}
                  </p>
                </div>
                <div className={`font-semibold text-sm ${tx.type === 'receipt' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'receipt' ? '+' : '-'}{formatAmount(Math.abs(tx.amount))}
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && <div className="text-center text-gray-400 py-3 text-xs">暂无交易记录</div>}
          </div>
        </div>

        {/* 近期发票动态 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-700">近期发票动态</h2>
            <Link to="/invoices" className="text-blue-600 text-xs hover:underline">查看全部 →</Link>
          </div>
          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{inv.invoice_no}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {invoiceTypeMap[inv.type] || inv.type} · {inv.supplier_name || '对方'} · {new Date(inv.invoice_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-blue-600">{formatAmount(inv.total_amount)}</p>
                  <p className={`text-xs ${inv.status === 'paid' ? 'text-green-500' : inv.status === 'cancelled' ? 'text-gray-400' : 'text-yellow-500'}`}>
                    {invoiceStatusMap[inv.status] || inv.status}
                  </p>
                </div>
              </div>
            ))}
            {recentInvoices.length === 0 && <div className="text-center text-gray-400 py-3 text-xs">暂无发票记录</div>}
          </div>
        </div>
      </div>
    </div>
  );
}