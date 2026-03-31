import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/authStore';

// ... 原有的接口定义保持不变 ...

export default function DashboardPage() {
  const { user } = useAuthStore();
  // ... 原有的 state 和 useEffect 保持不变 ...

  const formatAmount = (amount: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  const unpaidPurchase = stats.totalPurchaseAmount - stats.totalPaidAmount;
  const unpaidReceipt = stats.totalContractAmount - stats.totalReceiptAmount;

  const statCards = [
    { label: '项目总数', value: stats.totalProjects, icon: '📋', color: 'from-blue-500/30 to-blue-600/20' },
    { label: '在途项目金额', value: formatAmount(stats.ongoingAmount), icon: '🚚', color: 'from-orange-500/30 to-orange-600/20' },
    { label: '应付款总额', value: formatAmount(unpaidPurchase), icon: '💸', color: 'from-red-500/30 to-red-600/20' },
    { label: '应收款总额', value: formatAmount(unpaidReceipt), icon: '💰', color: 'from-green-500/30 to-green-600/20' },
  ];

  const statusMap = {
    planning: { label: '规划中', color: 'bg-purple-500/30 text-purple-200' },
    ongoing: { label: '进行中', color: 'bg-blue-500/30 text-blue-200' },
    completed: { label: '已完成', color: 'bg-green-500/30 text-green-200' },
    pending_payment: { label: '未收齐', color: 'bg-yellow-500/30 text-yellow-200' },
    suspended: { label: '已暂停', color: 'bg-gray-500/30 text-gray-200' },
  };
  const statusCounts = {
    planning: stats.planningProjects, ongoing: stats.ongoingProjects, completed: stats.completedProjects,
    pending_payment: stats.pendingPaymentProjects, suspended: stats.suspendedProjects,
  };

  // ... 其他映射保持不变 ...

  if (loading) return <div className="flex justify-center py-12"><div className="text-white/70">加载中...</div></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">仪表盘</h1>
        <p className="text-white/70 mt-1">欢迎回来，{user?.name}</p>
      </div>

      {/* 统计卡片 - 毛玻璃效果 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.color} backdrop-blur-xl rounded-2xl border border-white/20 p-5 shadow-lg hover:shadow-xl transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* 项目状态分布 */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-5 shadow-lg">
          <h2 className="text-base font-semibold text-white mb-4">项目状态分布</h2>
          <div className="space-y-3">
            {Object.entries(statusMap).map(([status, { label, color }]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-white/70 text-sm">{label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color.replace('text', 'bg')}`} style={{ width: `${(statusCounts[status as keyof typeof statusCounts] / stats.totalProjects) * 100}%` }}></div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${color}`}>
                    {statusCounts[status as keyof typeof statusCounts]} 个
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 待办提醒 */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-5 shadow-lg">
          <h2 className="text-base font-semibold text-white mb-4">待办提醒</h2>
          <div className="space-y-4">
            <div className="p-4 bg-red-500/20 rounded-xl border border-red-500/30">
              <p className="text-red-200 font-medium text-sm">待付款提醒</p>
              <p className="text-red-100 text-lg font-semibold mt-1">{formatAmount(unpaidPurchase)}</p>
            </div>
            <div className="p-4 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
              <p className="text-yellow-200 font-medium text-sm">待收款提醒</p>
              <p className="text-yellow-100 text-lg font-semibold mt-1">{formatAmount(unpaidReceipt)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 近期收付款动态 */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-white">近期收付款动态</h2>
            <Link to="/transactions" className="text-blue-300 text-sm hover:text-blue-200 transition-colors">查看全部 →</Link>
          </div>
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                <div>
                  <p className="font-medium text-white text-sm">{tx.project_name || '项目'}</p>
                  <p className="text-xs text-white/50 mt-0.5">
                    {new Date(tx.date).toLocaleDateString()} · {paymentMethodMap[tx.payment_method] || tx.payment_method}
                    {tx.remark && ` · ${tx.remark.slice(0, 25)}`}
                  </p>
                </div>
                <div className={`font-semibold text-sm ${tx.type === 'receipt' ? 'text-green-300' : 'text-red-300'}`}>
                  {tx.type === 'receipt' ? '+' : '-'}{formatAmount(Math.abs(tx.amount))}
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && <div className="text-center text-white/50 py-3 text-xs">暂无交易记录</div>}
          </div>
        </div>

        {/* 近期发票动态 */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/20 p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-white">近期发票动态</h2>
            <Link to="/invoices" className="text-blue-300 text-sm hover:text-blue-200 transition-colors">查看全部 →</Link>
          </div>
          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                <div>
                  <p className="font-medium text-white text-sm">{inv.invoice_no}</p>
                  <p className="text-xs text-white/50 mt-0.5">
                    {invoiceTypeMap[inv.type] || inv.type} · {inv.supplier_name || '对方'} · {new Date(inv.invoice_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-blue-300">{formatAmount(inv.total_amount)}</p>
                  <p className={`text-xs ${inv.status === 'paid' ? 'text-green-300' : inv.status === 'cancelled' ? 'text-white/30' : 'text-yellow-300'}`}>
                    {invoiceStatusMap[inv.status] || inv.status}
                  </p>
                </div>
              </div>
            ))}
            {recentInvoices.length === 0 && <div className="text-center text-white/50 py-3 text-xs">暂无发票记录</div>}
          </div>
        </div>
      </div>
    </div>
  );
}