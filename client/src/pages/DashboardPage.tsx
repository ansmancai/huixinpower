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
        // 1. 项目统计
        const { data: projects } = await supabase
          .from('projects')
          .select('status, contract_amount');
        
        if (projects) {
          const total = projects.length;
          const ongoing = projects.filter(p => p.status === 'ongoing').length;
          const completed = projects.filter(p => p.status === 'completed').length;
          const suspended = projects.filter(p => p.status === 'suspended').length;
          const planning = projects.filter(p => p.status === 'planning').length;
          const ongoingAmount = projects
            .filter(p => p.status === 'ongoing')
            .reduce((sum, p) => sum + (parseFloat(p.contract_amount) || 0), 0);
          const totalContract = projects.reduce((sum, p) => sum + (parseFloat(p.contract_amount) || 0), 0);
          
          setStats(prev => ({
            ...prev,
            totalProjects: total,
            ongoingProjects: ongoing,
            completedProjects: completed,
            suspendedProjects: suspended,
            planningProjects: planning,
            ongoingAmount: ongoingAmount,
            totalContractAmount: totalContract,
          }));
        }

        // 2. 采购统计
        const { data: purchases } = await supabase.from('purchases').select('amount');
        const totalPurchase = purchases?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
        
        // 3. 收付款统计
        const { data: transactions } = await supabase.from('transactions').select('type, amount');
        const totalPaid = transactions?.filter(t => t.type === 'payment').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0) || 0;
        const totalReceipt = transactions?.filter(t => t.type === 'receipt').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0;
        
        setStats(prev => ({
          ...prev,
          totalPurchaseAmount: totalPurchase,
          totalPaidAmount: totalPaid,
          totalReceiptAmount: totalReceipt,
        }));

        // 4. 近期收付款（带项目名称）
        const { data: recentTx } = await supabase
          .from('transactions')
          .select('*, projects(name)')
          .order('date', { ascending: false })
          .limit(5);
        
        if (recentTx) {
          setRecentTransactions(recentTx.map(tx => ({
            ...tx,
            project_name: tx.projects?.name,
          })));
        }

        // 5. 近期发票（带供应商名称）
        const { data: recentInv } = await supabase
          .from('invoices')
          .select('*, suppliers(name)')
          .order('invoice_date', { ascending: false })
          .limit(5);
        
        if (recentInv) {
          setRecentInvoices(recentInv.map(inv => ({
            ...inv,
            supplier_name: inv.suppliers?.name,
          })));
        }

      } catch (error) {
        console.error('加载仪表盘数据失败', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  };

  const unpaidPurchase = stats.totalPurchaseAmount - stats.totalPaidAmount;
  const unpaidReceipt = stats.totalContractAmount - stats.totalReceiptAmount;

  const statCards = [
    { label: '项目总数', value: stats.totalProjects, icon: '📋', color: 'bg-blue-500' },
    { label: '在途项目金额', value: formatAmount(stats.ongoingAmount), icon: '🚚', color: 'bg-orange-500' },
    { label: '应付款总额', value: formatAmount(unpaidPurchase), icon: '💸', color: 'bg-red-500' },
    { label: '应收款总额', value: formatAmount(unpaidReceipt), icon: '💰', color: 'bg-green-500' },
  ];

  const statusItems = [
    { label: '规划中', count: stats.planningProjects, color: 'bg-purple-100 text-purple-800' },
    { label: '进行中', count: stats.ongoingProjects, color: 'bg-blue-100 text-blue-800' },
    { label: '已完成', count: stats.completedProjects, color: 'bg-green-100 text-green-800' },
    { label: '已暂停', count: stats.suspendedProjects, color: 'bg-gray-100 text-gray-800' },
  ];

  const paymentMethodMap: Record<string, string> = {
    bank: '银行转账',
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    draft: '汇票',
    check: '支票',
    other: '其他',
  };

  const invoiceTypeMap: Record<string, string> = { input: '进项', output: '销项' };
  const invoiceStatusMap: Record<string, string> = { unpaid: '未付款', paid: '已付款', cancelled: '作废' };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="text-gray-500">加载中...</div></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">电力工程财务数据概览</h1>
        <p className="text-gray-500 mt-1">欢迎回来，{user?.name}</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} w-12 h-12 rounded-full flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 项目状态分布 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">项目状态分布</h2>
          <div className="space-y-3">
            {statusItems.map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-gray-600">{item.label}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${item.color}`}>
                  {item.count} 个项目
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 待办提醒 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">待办提醒</h2>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-red-600 font-medium">待付款提醒</p>
              <p className="text-red-500 text-sm">有未付款项 {formatAmount(unpaidPurchase)}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-yellow-600 font-medium">待收款提醒</p>
              <p className="text-yellow-500 text-sm">有未收款项 {formatAmount(unpaidReceipt)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 近期收付款动态 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">近期收付款动态</h2>
            <Link to="/transactions" className="text-blue-600 text-sm hover:underline">查看全部 →</Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{tx.project_name || '项目'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(tx.date).toLocaleDateString()} · {paymentMethodMap[tx.payment_method] || tx.payment_method}
                    {tx.remark && ` · ${tx.remark.slice(0, 30)}`}
                  </p>
                </div>
                <div className={`font-bold ${tx.type === 'receipt' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'receipt' ? '+' : '-'} {formatAmount(Math.abs(tx.amount))}
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="text-center text-gray-500 py-4">暂无交易记录</div>
            )}
          </div>
        </div>

        {/* 近期发票动态 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">近期发票动态</h2>
            <Link to="/invoices" className="text-blue-600 text-sm hover:underline">查看全部 →</Link>
          </div>
          <div className="space-y-3">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="flex justify-between items-center p-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{inv.invoice_no}</p>
                  <p className="text-sm text-gray-500">
                    {invoiceTypeMap[inv.type] || inv.type} · {inv.supplier_name || '对方'} · {new Date(inv.invoice_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{formatAmount(inv.total_amount)}</p>
                  <p className={`text-xs ${inv.status === 'paid' ? 'text-green-600' : inv.status === 'cancelled' ? 'text-gray-500' : 'text-yellow-600'}`}>
                    {invoiceStatusMap[inv.status] || inv.status}
                  </p>
                </div>
              </div>
            ))}
            {recentInvoices.length === 0 && (
              <div className="text-center text-gray-500 py-4">暂无发票记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}