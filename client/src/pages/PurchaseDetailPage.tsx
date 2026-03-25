import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPayments, setRelatedPayments] = useState<any[]>([]);
  const [relatedInvoices, setRelatedInvoices] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 获取采购详情
        const { data: purchaseData, error } = await supabase
          .from('purchases')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setPurchase(purchaseData);

        // 获取关联项目
        if (purchaseData.project_id) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('*')
            .eq('id', purchaseData.project_id)
            .single();
          setProject(projectData);
        }

        // 获取关联供应商
        if (purchaseData.supplier_id) {
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', purchaseData.supplier_id)
            .single();
          setSupplier(supplierData);
        }

        // 获取关联付款记录
        const { data: payments } = await supabase
          .from('transactions')
          .select('*')
          .eq('purchase_id', id)
          .eq('type', 'payment')
          .order('date', { ascending: false });
        setRelatedPayments(payments || []);

        // 获取关联发票
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('purchase_id', id)
          .order('invoice_date', { ascending: false });
        setRelatedInvoices(invoices || []);

      } catch (error) {
        console.error('加载采购详情失败', error);
        navigate('/purchases');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm(`确定要删除采购单 "${purchase?.purchase_no}" 吗？`)) return;
    try {
      await supabase.from('purchases').delete().eq('id', id);
      navigate('/purchases');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const statusMap: Record<string, string> = {
    ordered: '已下单',
    arrived: '已到货',
    pending: '待发货',
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  };

  const totalPaid = relatedPayments.reduce((sum, p) => sum + Math.abs(parseFloat(p.amount)), 0);
  const totalInvoiced = relatedInvoices.reduce((sum, i) => sum + parseFloat(i.total_amount), 0);
  const amount = purchase ? parseFloat(purchase.amount) : 0;

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!purchase) {
    return <div className="text-center py-12 text-gray-500">采购单不存在</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/purchases" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回采购列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{purchase.content}</h1>
          <p className="text-gray-500">采购单号：{purchase.purchase_no}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => navigate(`/purchases/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑采购单
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              删除采购单
            </button>
          )}
        </div>
      </div>

      {/* 采购基本信息 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">采购信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">物流状态</p>
            <span className="inline-block px-2 py-1 rounded-full text-xs bg-blue-100 mt-1">
              {statusMap[purchase.logistics_status] || purchase.logistics_status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">所属项目</p>
            {project ? (
              <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                {project.name}
              </Link>
            ) : (
              <p className="font-medium">{purchase.project_id || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">供应商</p>
            {supplier ? (
              <Link to={`/suppliers/${supplier.id}`} className="text-blue-600 hover:underline">
                {supplier.name}
              </Link>
            ) : (
              <p className="font-medium">{purchase.supplier_id || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">采购日期</p>
            <p className="font-medium">{new Date(purchase.purchase_date).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500">采购内容</p>
          <p className="mt-1 text-gray-700">{purchase.content}</p>
        </div>
        {purchase.remark && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">备注</p>
            <p className="mt-1 text-gray-700">{purchase.remark}</p>
          </div>
        )}
      </div>

      {/* 财务统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">采购金额</p>
          <p className="text-xl font-bold text-blue-600">{formatAmount(amount)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已付款金额</p>
          <p className="text-xl font-bold text-green-600">{formatAmount(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">未付款金额</p>
          <p className="text-xl font-bold text-red-600">{formatAmount(amount - totalPaid)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已收票金额</p>
          <p className="text-xl font-bold text-orange-600">{formatAmount(totalInvoiced)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">未收票金额</p>
          <p className="text-xl font-bold text-yellow-600">{formatAmount(amount - totalInvoiced)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已收票未付款</p>
          <p className="text-xl font-bold text-purple-600">{formatAmount(totalInvoiced - totalPaid)}</p>
        </div>
      </div>

      {/* 关联操作按钮 */}
      <div className="flex gap-3 mb-6">
        <Link
          to={`/transactions/new?purchaseId=${id}&projectId=${purchase.project_id}&supplierId=${purchase.supplier_id}`}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + 新建付款
        </Link>
        <Link
          to={`/invoices/new?purchaseId=${id}&projectId=${purchase.project_id}&supplierId=${purchase.supplier_id}`}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + 新建发票
        </Link>
      </div>

      {/* 关联付款记录 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">关联付款记录</h2>
        {relatedPayments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无付款记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">日期</th>
                  <th className="px-4 py-2 text-right text-sm">金额</th>
                  <th className="px-4 py-2 text-left text-sm">支付方式</th>
                  <th className="px-4 py-2 text-left text-sm">备注</th>
                </tr>
              </thead>
              <tbody>
                {relatedPayments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2 text-sm">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatAmount(Math.abs(parseFloat(p.amount)))}</td>
                    <td className="px-4 py-2 text-sm">
                      {p.payment_method === 'bank' ? '银行转账' : p.payment_method === 'cash' ? '现金' : p.payment_method === 'wechat' ? '微信' : p.payment_method === 'alipay' ? '支付宝' : p.payment_method}
                    </td>
                    <td className="px-4 py-2 text-sm max-w-[200px] truncate">{p.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 关联发票记录 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">关联发票记录</h2>
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
                  <th className="px-4 py-2 text-center text-sm">状态</th>
                </tr>
              </thead>
              <tbody>
                {relatedInvoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-4 py-2 text-sm">{inv.type === 'input' ? '进项' : '销项'}</td>
                    <td className="px-4 py-2">
                      <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">
                        {inv.invoice_no}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">{formatAmount(parseFloat(inv.total_amount || inv.amount))}</td>
                    <td className="px-4 py-2 text-sm">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-center">
                      
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                          inv.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                          inv.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                          {inv.status === 'paid' ? '已付款' : 
                           inv.status === 'partial' ? '部分付款' :
                           inv.status === 'cancelled' ? '作废' : '未付款'}
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