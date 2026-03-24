import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';

interface Stats {
  totalProjects: number;
  ongoingAmount: number;
  unpaidAmount: number;
  unpaidInvoiceAmount: number;
}

interface RecentTransaction {
  id: string;
  date: string;
  type: string;
  amount: string;
  paymentMethod: string;
  projectId?: string;
  supplierId?: string;
  remark: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    ongoingAmount: 0,
    unpaidAmount: 0,
    unpaidInvoiceAmount: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, txData] = await Promise.all([
          api.dashboard.getStats(),
          api.transactions.list({ pageSize: 5 }),
        ]);
        setStats(statsData);
        setRecentTransactions(txData.data);
      } catch (error) {
        console.error('加载仪表盘数据失败', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  };

  const getProjectName = (projectId?: string) => {
    // 简化版，实际应该从 store 或 API 获取
    const names: Record<string, string> = {
      '1': '南城正通达',
      '2': '万宏广场',
      '3': '万江4号楼',
      '4': '大朗阳光城',
      '19': '万江坝头数据标注产业园16楼电缆采购',
    };
    return projectId ? names[projectId] || '项目' : '-';
  };

  const statCards = [
    { label: '项目总数', value: stats.totalProjects, icon: '📋', color: 'bg-blue-500' },
    { label: '在途项目金额', value: formatAmount(stats.ongoingAmount), icon: '🚚', color: 'bg-orange-500' },
    { label: '应付款总额', value: formatAmount(stats.unpaidAmount), icon: '💸', color: 'bg-red-500' },
    { label: '应收款总额', value: formatAmount(stats.unpaidInvoiceAmount), icon: '💰', color: 'bg-green-500' },
  ];

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 项目状态分布 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">项目状态分布</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">规划中</span>
              <span className="font-medium">0 个项目</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">进行中</span>
              <span className="font-medium">4 个项目</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">已完成</span>
              <span className="font-medium">15 个项目</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">已暂停</span>
              <span className="font-medium">4 个项目</span>
            </div>
          </div>
        </div>

        {/* 待办提醒 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">待办提醒</h2>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-red-600 font-medium">待付款提醒</p>
              <p className="text-red-500 text-sm">有未付款项 {formatAmount(stats.unpaidAmount)}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-yellow-600 font-medium">待收款提醒</p>
              <p className="text-yellow-500 text-sm">有未收款项 {formatAmount(stats.unpaidInvoiceAmount)}</p>
            </div>
          </div>
        </div>

        {/* 近期收付款动态 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">近期收付款动态</h2>
            <Link to="/transactions" className="text-blue-600 text-sm hover:underline">查看全部 →</Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{getProjectName(tx.projectId)}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(tx.date).toLocaleDateString()} · {tx.paymentMethod === 'bank' ? '银行转账' : tx.paymentMethod}
                    {tx.remark && ` · ${tx.remark.slice(0, 30)}`}
                  </p>
                </div>
                <div className={`font-bold ${tx.type === 'receipt' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'receipt' ? '+' : '-'} {formatAmount(Math.abs(parseFloat(tx.amount)))}
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="text-center text-gray-500 py-4">暂无交易记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}