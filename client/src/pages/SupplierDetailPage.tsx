import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPurchases, setRelatedPurchases] = useState<any[]>([]);
  const [relatedTransactions, setRelatedTransactions] = useState<any[]>([]);
  const [relatedInvoices, setRelatedInvoices] = useState<any[]>([]);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 获取供应商详情
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', id)
          .single();
        if (supplierError) throw supplierError;
        setSupplier(supplierData);

        // 获取关联采购
        let purchasesQuery = supabase
          .from('purchases')
          .select('*, projects(name)')
          .eq('supplier_id', id)
          .order('purchase_date', { ascending: false });
        
        const { data: purchasesData } = await purchasesQuery;
        setRelatedPurchases(purchasesData || []);

        // 获取关联收付款
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select('*, projects(name)')
          .eq('supplier_id', id)
          .order('date', { ascending: false });
        setRelatedTransactions(transactionsData || []);

        // 获取关联发票
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('*, projects(name)')
          .eq('supplier_id', id)
          .order('invoice_date', { ascending: false });
        setRelatedInvoices(invoicesData || []);

      } catch (error) {
        console.error('加载供应商详情失败', error);
        navigate('/suppliers');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm(`确定要删除供应商 "${supplier?.name}" 吗？`)) return;
    try {
      await supabase.from('suppliers').delete().eq('id', id);
      navigate('/suppliers');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const categoryMap: Record<string, string> = {
    equipment: '设备材料',
    installation: '安装',
    construction: '土建',
    other: '生活/其他',
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  };

  // 计算统计数据
  const totalPurchases = relatedPurchases.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalPaid = relatedTransactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
  const totalInvoiced = relatedInvoices.reduce((sum, i) => sum + parseFloat(i.total_amount), 0);
  const unpaidAmount = totalPurchases - totalPaid;
  const uninvoicedAmount = totalPurchases - totalInvoiced;
  const invoicedUnpaid = totalInvoiced - totalPaid;

  // 筛选未付款采购
  const filteredPurchases = showUnpaidOnly
    ? relatedPurchases.filter(p => {
        const paidForPurchase = relatedTransactions
          .filter(t => t.purchase_id === p.id && t.type === 'payment')
          .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
        return parseFloat(p.amount) > paidForPurchase;
      })
    : relatedPurchases;

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!supplier) {
    return <div className="text-center py-12 text-gray-500">供应商不存在</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/suppliers" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回供应商列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{supplier.name}</h1>
          <p className="text-gray-500">供应商编号：{supplier.code}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => navigate(`/suppliers/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑供应商
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              删除供应商
            </button>
          )}
        </div>
      </div>

      {/* 基础信息卡片 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">基础信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">类别</p>
            <p className="font-medium">{categoryMap[supplier.category] || supplier.category}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">联系人</p>
            <p className="font-medium">{supplier.contact_person || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">联系电话</p>
            <p className="font-medium">{supplier.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">地址</p>
            <p className="font-medium">{supplier.address || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">开户行</p>
            <p className="font-medium">{supplier.bank || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">账号</p>
            <p className="font-medium">{supplier.account || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">评级</p>
            <p className="font-medium">{supplier.rating ? `${supplier.rating} 星` : '-'}</p>
          </div>
        </div>
        {supplier.remark && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">备注</p>
            <p className="mt-1 text-gray-700">{supplier.remark}</p>
          </div>
        )}
      </div>

      {/* 财务统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已采购总额</p>
          <p className="text-xl font-bold text-blue-600">{formatAmount(totalPurchases)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已付款总额</p>
          <p className="text-xl font-bold text-green-600">{formatAmount(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已收票总额</p>
          <p className="text-xl font-bold text-orange-600">{formatAmount(totalInvoiced)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">未付款</p>
          <p className="text-xl font-bold text-red-600">{formatAmount(unpaidAmount)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">未收票</p>
          <p className="text-xl font-bold text-orange-600">{formatAmount(uninvoicedAmount)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已收票但未付款</p>
          <p className="text-xl font-bold text-yellow-600">{formatAmount(invoicedUnpaid)}</p>
        </div>
      </div>

      {/* 关联操作按钮 */}
      <div className="flex gap-3 mb-6">
        <Link
          to={`/purchases/new?supplierId=${id}`}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + 新建采购
        </Link>
        <Link
          to={`/transactions/new?supplierId=${id}`}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + 新建收付款
        </Link>
      </div>

      {/* 关联采购记录 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">关联采购记录</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showUnpaidOnly}
              onChange={(e) => setShowUnpaidOnly(e.target.checked)}
              className="rounded"
            />
            只看未付款
          </label>
        </div>
        {filteredPurchases.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无采购记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">日期</th>
                  <th className="px-4 py-2 text-left text-sm">内容</th>
                  <th className="px-4 py-2 text-left text-sm">所属项目</th>
                  <th className="px-4 py-2 text-right text-sm">金额</th>
                  <th className="px-4 py-2 text-right text-sm">未付款金额</th>
                  <th className="px-4 py-2 text-center text-sm">物流状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p) => {
                  const paidForPurchase = relatedTransactions
                    .filter(t => t.purchase_id === p.id && t.type === 'payment')
                    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
                  const unpaid = parseFloat(p.amount) - paidForPurchase;
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-2 text-sm">{new Date(p.purchase_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <Link to={`/purchases/${p.id}`} className="text-blue-600 hover:underline">
                          {p.content}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">{p.projects?.name || '-'}</td>
                      <td className="px-4 py-2 text-right">{formatAmount(parseFloat(p.amount))}</td>
                      <td className="px-4 py-2 text-right text-red-600">{formatAmount(unpaid)}</td>
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

      {/* 关联收付款记录 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">关联收付款记录</h2>
        {relatedTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无收付款记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">日期</th>
                  <th className="px-4 py-2 text-left text-sm">类型</th>
                  <th className="px-4 py-2 text-right text-sm">金额</th>
                  <th className="px-4 py-2 text-left text-sm">支付方式</th>
                  <th className="px-4 py-2 text-left text-sm">关联项目</th>
                  <th className="px-4 py-2 text-left text-sm">备注</th>
                </tr>
              </thead>
              <tbody>
                {relatedTransactions.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2 text-sm">{new Date(t.date).toLocaleDateString()} </td>
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
                    <td className="px-4 py-2 text-sm">{t.projects?.name || '-'}</td>
                    <td className="px-4 py-2 text-sm max-w-[200px] truncate">{t.remark || '-'}</td>
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
                  <th className="px-4 py-2 text-left text-sm">所属项目</th>
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
                    <td className="px-4 py-2 text-sm">{inv.projects?.name || '-'}</td>
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