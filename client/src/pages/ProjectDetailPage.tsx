import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPurchases, setRelatedPurchases] = useState<any[]>([]);
  const [relatedTransactions, setRelatedTransactions] = useState<any[]>([]);
  const [relatedInvoices, setRelatedInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalPaid: 0,
    totalReceipt: 0,
    totalInvoiced: 0,
  });

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 获取项目详情
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
        if (projectError) throw projectError;
        setProject(projectData);

        // 获取关联采购
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('*, suppliers(name)')
          .eq('project_id', id)
          .order('purchase_date', { ascending: false });
        setRelatedPurchases(purchasesData || []);

        // 获取关联收付款
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select('*, suppliers(name)')
          .eq('project_id', id)
          .order('date', { ascending: false });
        setRelatedTransactions(transactionsData || []);

        // 获取关联发票
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('*, suppliers(name)')
          .eq('project_id', id)
          .order('invoice_date', { ascending: false });
        setRelatedInvoices(invoicesData || []);

        // 计算统计数据
        const totalPurchases = purchasesData?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
        const totalPaid = transactionsData?.filter(t => t.type === 'payment').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) || 0;
        const totalReceipt = transactionsData?.filter(t => t.type === 'receipt').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
        const totalInvoiced = invoicesData?.reduce((sum, i) => sum + parseFloat(i.total_amount), 0) || 0;

        setStats({ totalPurchases, totalPaid, totalReceipt, totalInvoiced });

      } catch (error) {
        console.error('加载项目详情失败', error);
        navigate('/projects');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm(`确定要删除项目 "${project?.name}" 吗？`)) return;
    try {
      await supabase.from('projects').delete().eq('id', id);
      navigate('/projects');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    ongoing: { label: '进行中', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
    pending_payment: { label: '未收齐', color: 'bg-yellow-100 text-yellow-800' },
    suspended: { label: '已暂停', color: 'bg-gray-100 text-gray-800' },
    planning: { label: '规划中', color: 'bg-purple-100 text-purple-800' },
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!project) {
    return <div className="text-center py-12 text-gray-500">项目不存在</div>;
  }

  const contractAmount = parseFloat(project.contract_amount || '0');
  const unpaidAmount = contractAmount - stats.totalReceipt;
  const uninvoicedAmount = contractAmount - stats.totalInvoiced;
  const invoicedUnpaid = stats.totalInvoiced - stats.totalReceipt;
  const unpaidPurchase = stats.totalPurchases - stats.totalPaid;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/projects" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回项目列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-gray-500">项目编号：{project.code}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => navigate(`/projects/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑项目
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              删除项目
            </button>
          )}
        </div>
      </div>

      {/* 状态标签 */}
      <div className="mb-6">
        <span className={`inline-block px-3 py-1 rounded-full text-sm ${statusMap[project.status]?.color || 'bg-gray-100'}`}>
          {statusMap[project.status]?.label || project.status}
        </span>
      </div>

      {/* 基础信息卡片 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">基础信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">甲方</p>
            <p className="font-medium">{project.client || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">乙方</p>
            <p className="font-medium">{project.contractor || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">合同编号</p>
            <p className="font-medium">{project.contract_no || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">合同金额</p>
            <p className="font-medium">{formatAmount(contractAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">开工日期</p>
            <p className="font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">完工日期</p>
            <p className="font-medium">{project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}</p>
          </div>
        </div>
        {project.remark && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">备注</p>
            <p className="mt-1 text-gray-700">{project.remark}</p>
          </div>
        )}
      </div>

      {/* 财务统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已收款</p>
          <p className="text-xl font-bold text-green-600">{formatAmount(stats.totalReceipt)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已开发票</p>
          <p className="text-xl font-bold text-blue-600">{formatAmount(stats.totalInvoiced)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已采购</p>
          <p className="text-xl font-bold text-orange-600">{formatAmount(stats.totalPurchases)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已付款</p>
          <p className="text-xl font-bold text-red-600">{formatAmount(stats.totalPaid)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已收票</p>
          <p className="text-xl font-bold text-purple-600">{formatAmount(stats.totalInvoiced)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">未收款</p>
          <p className="text-xl font-bold text-red-600">{formatAmount(unpaidAmount)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">未开票</p>
          <p className="text-xl font-bold text-orange-600">{formatAmount(uninvoicedAmount)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已开票但未收款</p>
          <p className="text-xl font-bold text-yellow-600">{formatAmount(invoicedUnpaid)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">未付款</p>
          <p className="text-xl font-bold text-red-600">{formatAmount(unpaidPurchase)}</p>
        </div>
      </div>

      {/* 关联操作按钮 */}
      <div className="flex gap-3 mb-6">
        <Link
          to={`/purchases/new?projectId=${id}`}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + 新建采购
        </Link>
        <Link
          to={`/transactions/new?projectId=${id}`}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + 新建收付款
        </Link>
      </div>

      {/* 采购记录 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">采购记录</h2>
          <Link to={`/purchases/new?projectId=${id}`} className="text-blue-600 text-sm hover:underline">
            + 新建采购
          </Link>
        </div>
        {relatedPurchases.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无采购记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">日期</th>
                  <th className="px-4 py-2 text-left text-sm">采购内容</th>
                  <th className="px-4 py-2 text-left text-sm">供应商</th>
                  <th className="px-4 py-2 text-right text-sm">金额</th>
                  <th className="px-4 py-2 text-right text-sm">未付款金额</th>
                  <th className="px-4 py-2 text-center text-sm">物流状态</th>
                </tr>
              </thead>
              <tbody>
                {relatedPurchases.map((p) => {
                  // 计算该采购的已付款金额
                  const paidForPurchase = relatedTransactions
                    .filter(t => t.purchase_id === p.id && t.type === 'payment')
                    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
                  const unpaidAmount = parseFloat(p.amount) - paidForPurchase;
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-2 text-sm">{new Date(p.purchase_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <Link to={`/purchases/${p.id}`} className="text-blue-600 hover:underline">
                          {p.content}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">{p.suppliers?.name || '-'}</td>
                      <td className="px-4 py-2 text-right">{formatAmount(parseFloat(p.amount))}</td>
                      <td className="px-4 py-2 text-right text-red-600">{formatAmount(unpaidAmount)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100">
                          {p.logistics_status === 'arrived' ? '已到货' : p.logistics_status === 'ordered' ? '已下单' : '待发货'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 收付款记录 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">收付款记录</h2>
        {relatedTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无交易记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">日期</th>
                  <th className="px-4 py-2 text-left text-sm">类型</th>
                  <th className="px-4 py-2 text-right text-sm">金额</th>
                  <th className="px-4 py-2 text-left text-sm">支付方式</th>
                  <th className="px-4 py-2 text-left text-sm">关联供应商</th>
                  <th className="px-4 py-2 text-left text-sm">备注</th>
                </tr>
              </thead>
              <tbody>
                {relatedTransactions.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2 text-sm">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <span className={t.type === 'receipt' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {t.type === 'receipt' ? '收款' : '付款'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={t.type === 'receipt' ? 'text-green-600' : 'text-red-600'}>
                        {t.type === 'receipt' ? '+' : '-'}{formatAmount(Math.abs(parseFloat(t.amount)))}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {t.payment_method === 'bank' ? '银行转账' : t.payment_method === 'cash' ? '现金' : t.payment_method === 'wechat' ? '微信' : t.payment_method === 'alipay' ? '支付宝' : t.payment_method}
                    </td>
                    <td className="px-4 py-2 text-sm">{t.suppliers?.name || '-'}</td>
                    <td className="px-4 py-2 text-sm max-w-[200px] truncate">{t.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 发票记录 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">发票记录</h2>
        {relatedInvoices.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无发票记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">发票类型</th>
                  <th className="px-4 py-2 text-left text-sm">发票号码</th>
                  <th className="px-4 py-2 text-right text-sm">金额</th>
                  <th className="px-4 py-2 text-left text-sm">开票日期</th>
                  <th className="px-4 py-2 text-left text-sm">对方名称</th>
                  <th className="px-4 py-2 text-center text-sm">状态</th>
                </tr>
              </thead>
              <tbody>
                {relatedInvoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-4 py-2 text-sm">
                      {inv.type === 'input' ? '进项' : '销项'}
                    </td>
                    <td className="px-4 py-2">
                      <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">
                        {inv.invoice_no}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatAmount(parseFloat(inv.total_amount || inv.amount))}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {inv.suppliers?.name || '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                        inv.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inv.status === 'paid' ? '已付款' : inv.status === 'cancelled' ? '作废' : '未付款'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}