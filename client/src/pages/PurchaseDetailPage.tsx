import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const purchaseData = await api.purchases.get(id);
        setPurchase(purchaseData);
        
        if (purchaseData.projectId) {
          try {
            const projectData = await api.projects.get(purchaseData.projectId);
            setProject(projectData);
          } catch (e) {}
        }
        
        if (purchaseData.supplierId) {
          try {
            const supplierData = await api.suppliers.get(purchaseData.supplierId);
            setSupplier(supplierData);
          } catch (e) {}
        }
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
    if (!confirm(`确定要删除采购单 "${purchase?.name}" 吗？`)) return;
    try {
      await api.purchases.delete(id!);
      navigate('/purchases');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
    approved: { label: '已审批', color: 'bg-blue-100 text-blue-800' },
    ordered: { label: '已下单', color: 'bg-yellow-100 text-yellow-800' },
    received: { label: '已收货', color: 'bg-green-100 text-green-800' },
    cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
  };

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
          <h1 className="text-2xl font-bold text-gray-800">{purchase.name}</h1>
          <p className="text-gray-500">采购单号：{purchase.purchaseNo}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/purchases/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑采购单
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                删除采购单
              </button>
            )}
          </div>
        )}
      </div>

      {/* 采购基本信息 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">采购信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">状态</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${statusMap[purchase.status]?.color || 'bg-gray-100'}`}>
              {statusMap[purchase.status]?.label || purchase.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">所属项目</p>
            {project ? (
              <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                {project.name}
              </Link>
            ) : (
              <p className="font-medium">{purchase.projectId || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">供应商</p>
            {supplier ? (
              <Link to={`/suppliers/${supplier.id}`} className="text-blue-600 hover:underline">
                {supplier.name}
              </Link>
            ) : (
              <p className="font-medium">{purchase.supplierId || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">下单日期</p>
            <p className="font-medium">{purchase.orderDate ? new Date(purchase.orderDate).toLocaleDateString() : '-'}</p>
          </div>
        </div>
      </div>

      {/* 采购明细 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">采购明细</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b pb-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">数量</p>
            <p className="text-xl font-semibold">{purchase.quantity || '-'} {purchase.unit || ''}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">单价</p>
            <p className="text-xl font-semibold">¥{purchase.unitPrice || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">总金额</p>
            <p className="text-xl font-semibold text-blue-600">¥{purchase.totalAmount || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">预计交货日期</p>
            <p className="font-medium">{purchase.deliveryDate ? new Date(purchase.deliveryDate).toLocaleDateString() : '-'}</p>
          </div>
        </div>
        
        {/* 附件信息（预留） */}
        {purchase.attachments && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">附件</p>
            <p className="text-sm text-gray-600 mt-1">{purchase.attachments}</p>
          </div>
        )}
      </div>
    </div>
  );
}