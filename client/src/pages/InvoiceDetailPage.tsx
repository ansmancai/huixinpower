import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const invoiceData = await api.invoices.get(id);
        setInvoice(invoiceData);
        
        if (invoiceData.projectId) {
          try {
            const projectData = await api.projects.get(invoiceData.projectId);
            setProject(projectData);
          } catch (e) {}
        }
        
        if (invoiceData.supplierId) {
          try {
            const supplierData = await api.suppliers.get(invoiceData.supplierId);
            setSupplier(supplierData);
          } catch (e) {}
        }
        
        if (invoiceData.transactionId) {
          try {
            const transactionData = await api.transactions.get(invoiceData.transactionId);
            setTransaction(transactionData);
          } catch (e) {}
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
    if (!confirm(`确定要删除发票 "${invoice?.invoiceNo}" 吗？`)) return;
    try {
      await api.invoices.delete(id!);
      navigate('/invoices');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const typeMap: Record<string, string> = {
    purchase: '采购发票',
    sales: '销售发票',
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    unpaid: { label: '未付款', color: 'bg-yellow-100 text-yellow-800' },
    paid: { label: '已付款', color: 'bg-green-100 text-green-800' },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
  };

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
          <p className="text-gray-500">发票号：{invoice.invoiceNo}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/invoices/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑发票
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                删除发票
              </button>
            )}
          </div>
        )}
      </div>

      {/* 发票基本信息 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">发票信息</h2>
          <span className={`px-3 py-1 rounded-full text-sm ${statusMap[invoice.status]?.color || 'bg-gray-100'}`}>
            {statusMap[invoice.status]?.label || invoice.status}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">发票类型</p>
            <p className="font-medium">{typeMap[invoice.type] || invoice.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">所属项目</p>
            {project ? (
              <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                {project.name}
              </Link>
            ) : (
              <p className="font-medium">{invoice.projectId || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">供应商</p>
            {supplier ? (
              <Link to={`/suppliers/${supplier.id}`} className="text-blue-600 hover:underline">
                {supplier.name}
              </Link>
            ) : (
              <p className="font-medium">{invoice.supplierId || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">关联交易</p>
            {transaction ? (
              <Link to={`/transactions/${transaction.id}`} className="text-blue-600 hover:underline">
                {transaction.transactionNo}
              </Link>
            ) : (
              <p className="font-medium">{invoice.transactionId || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">开票日期</p>
            <p className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-sm text-gray-500">金额</p>
            <p className="text-xl font-semibold">¥{invoice.amount}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">税额</p>
            <p className="text-xl font-semibold">¥{invoice.taxAmount || '0'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">总金额</p>
            <p className="text-xl font-semibold text-blue-600">¥{invoice.totalAmount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}