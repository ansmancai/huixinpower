import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const txData = await api.transactions.get(id);
        setTransaction(txData);
        
        if (txData.projectId) {
          try {
            const projectData = await api.projects.get(txData.projectId);
            setProject(projectData);
          } catch (e) {}
        }
        
        if (txData.supplierId) {
          try {
            const supplierData = await api.suppliers.get(txData.supplierId);
            setSupplier(supplierData);
          } catch (e) {}
        }
      } catch (error) {
        console.error('加载交易详情失败', error);
        navigate('/transactions');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm(`确定要删除交易记录 "${transaction?.transactionNo}" 吗？`)) return;
    try {
      await api.transactions.delete(id!);
      navigate('/transactions');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const typeMap: Record<string, { label: string; color: string; bg: string }> = {
    payment: { label: '付款', color: 'text-red-600', bg: 'bg-red-50' },
    receipt: { label: '收款', color: 'text-green-600', bg: 'bg-green-50' },
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
    failed: { label: '失败', color: 'bg-red-100 text-red-800' },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!transaction) {
    return <div className="text-center py-12 text-gray-500">交易记录不存在</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/transactions" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回交易列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">交易详情</h1>
          <p className="text-gray-500">交易编号：{transaction.transactionNo}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/transactions/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑交易
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                删除交易
              </button>
            )}
          </div>
        )}
      </div>

      {/* 交易基本信息 */}
      <div className={`rounded-lg shadow-md p-6 mb-6 ${typeMap[transaction.type]?.bg || 'bg-white'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold mb-4">
              {typeMap[transaction.type]?.label}交易
            </h2>
            <div className="text-4xl font-bold mb-4">
              <span className={typeMap[transaction.type]?.color}>
                {transaction.type === 'receipt' ? '+' : '-'} ¥{transaction.amount}
              </span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${statusMap[transaction.status]?.color || 'bg-gray-100'}`}>
            {statusMap[transaction.status]?.label || transaction.status}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-500">所属项目</p>
            {project ? (
              <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                {project.name}
              </Link>
            ) : (
              <p className="font-medium">{transaction.projectId || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">供应商</p>
            {supplier ? (
              <Link to={`/suppliers/${supplier.id}`} className="text-blue-600 hover:underline">
                {supplier.name}
              </Link>
            ) : (
              <p className="font-medium">{transaction.supplierId || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">币种</p>
            <p className="font-medium">{transaction.currency || 'CNY'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">支付方式</p>
            <p className="font-medium">{transaction.paymentMethod || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">交易日期</p>
            <p className="font-medium">{new Date(transaction.transactionDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">参考号</p>
            <p className="font-medium">{transaction.reference || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}