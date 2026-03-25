import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [purchase, setPurchase] = useState<any>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: invoiceData, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setInvoice(invoiceData);
        
        if (invoiceData.project_id) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('*')
            .eq('id', invoiceData.project_id)
            .single();
          setProject(projectData);
        }
        
        if (invoiceData.supplier_id) {
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', invoiceData.supplier_id)
            .single();
          setSupplier(supplierData);
        }
        
        if (invoiceData.purchase_id) {
          const { data: purchaseData } = await supabase
            .from('purchases')
            .select('*')
            .eq('id', invoiceData.purchase_id)
            .single();
          setPurchase(purchaseData);
        }
      } catch (error) {
        console.error('加载发票详情失败', error);
        navigate('/invoices');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm(`确定要删除发票 "${invoice?.invoice_no}" 吗？`)) return;
    try {
      await supabase.from('invoices').delete().eq('id', id);
      navigate('/invoices');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const typeMap: Record<string, string> = { input: '进项', output: '销项' };
  const statusMap: Record<string, string> = { unpaid: '未付款', paid: '已付款', partial: '部分付款',cancelled: '作废' };
  const formatAmount = (amount: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!invoice) {
    return <div className="text-center py-12 text-gray-500">发票不存在</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/invoices" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回发票列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">发票详情</h1>
          <p className="text-gray-500">发票号：{invoice.invoice_no}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => navigate(`/invoices/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑发票
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              删除发票
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">发票信息</h2>
          <span className={`px-3 py-1 rounded-full text-sm ${
            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
            invoice.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {statusMap[invoice.status] || invoice.status}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">发票类型</p>
            <p className="font-medium">{typeMap[invoice.type] || invoice.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">开票日期</p>
            <p className="font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">对方名称</p>
            {supplier ? (
              <Link to={`/suppliers/${supplier.id}`} className="text-blue-600 hover:underline">
                {supplier.name}
              </Link>
            ) : (
              <p className="font-medium">{invoice.supplier_id || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">所属项目</p>
            {project ? (
              <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                {project.name}
              </Link>
            ) : (
              <p className="font-medium">{invoice.project_id || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">关联采购</p>
            {purchase ? (
              <Link to={`/purchases/${purchase.id}`} className="text-blue-600 hover:underline">
                {purchase.purchase_no}
              </Link>
            ) : (
              <p className="font-medium">{invoice.purchase_id || '-'}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-sm text-gray-500">金额</p>
            <p className="text-xl font-semibold">{formatAmount(parseFloat(invoice.amount))}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">税额</p>
            <p className="text-xl font-semibold">{invoice.tax_amount ? formatAmount(parseFloat(invoice.tax_amount)) : '-'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">总金额</p>
            <p className="text-xl font-semibold text-blue-600">{formatAmount(parseFloat(invoice.total_amount))}</p>
          </div>
        </div>

        {invoice.remark && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">备注</p>
            <p className="mt-1 text-gray-700">{invoice.remark}</p>
          </div>
        )}
      </div>
    </div>
  );
}