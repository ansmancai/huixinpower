import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function PaymentApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [purchase, setPurchase] = useState<any>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const canApprove = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const appData = await api.paymentApplications.get(id);
        setApplication(appData);
        
        if (appData.projectId) {
          try {
            const projectData = await api.projects.get(appData.projectId);
            setProject(projectData);
          } catch (e) {}
        }
        
        if (appData.supplierId) {
          try {
            const supplierData = await api.suppliers.get(appData.supplierId);
            setSupplier(supplierData);
          } catch (e) {}
        }
        
        if (appData.purchaseId) {
          try {
            const purchaseData = await api.purchases.get(appData.purchaseId);
            setPurchase(purchaseData);
          } catch (e) {}
        }
      } catch (error) {
        console.error('加载付款申请详情失败', error);
        navigate('/payment-applications');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleApprove = async (status: 'approved' | 'rejected') => {
    if (!confirm(`确定要${status === 'approved' ? '通过' : '驳回'}这笔付款申请吗？`)) return;
    try {
      await api.paymentApplications.approve(id!, status);
      navigate('/payment-applications');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handlePaid = async () => {
    if (!confirm('确定标记为已付款吗？')) return;
    try {
      await api.paymentApplications.approve(id!, 'paid');
      navigate('/payment-applications');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除付款申请 "${application?.applicationNo}" 吗？`)) return;
    try {
      await api.paymentApplications.delete(id!);
      navigate('/payment-applications');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: '待审批', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: '已通过', color: 'bg-blue-100 text-blue-800' },
    rejected: { label: '已驳回', color: 'bg-red-100 text-red-800' },
    paid: { label: '已付款', color: 'bg-green-100 text-green-800' },
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!application) {
    return <div className="text-center py-12 text-gray-500">付款申请不存在</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/payment-applications" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回付款申请列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">付款申请详情</h1>
          <p className="text-gray-500">申请编号：{application.applicationNo}</p>
        </div>
        <div className="flex gap-2">
          {canApprove && application.status === 'pending' && (
            <>
              <button
                onClick={() => handleApprove('approved')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                通过申请
              </button>
              <button
                onClick={() => handleApprove('rejected')}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                驳回申请
              </button>
            </>
          )}
          {canEdit && application.status === 'approved' && (
            <button
              onClick={handlePaid}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              标记已付款
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => navigate(`/payment-applications/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑申请
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              删除申请
            </button>
          )}
        </div>
      </div>

      {/* 申请信息 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">申请信息</h2>
          <span className={`px-3 py-1 rounded-full text-sm ${statusMap[application.status]?.color || 'bg-gray-100'}`}>
            {statusMap[application.status]?.label || application.status}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">申请金额</p>
            <p className="text-2xl font-bold text-red-600">¥{application.amount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">所属项目</p>
            {project ? (
              <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                {project.name}
              </Link>
            ) : (
              <p className="font-medium">{application.projectId || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">供应商</p>
            {supplier ? (
              <Link to={`/suppliers/${supplier.id}`} className="text-blue-600 hover:underline">
                {supplier.name}
              </Link>
            ) : (
              <p className="font-medium">{application.supplierId || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">关联采购单</p>
            {purchase ? (
              <Link to={`/purchases/${purchase.id}`} className="text-blue-600 hover:underline">
                {purchase.purchaseNo}
              </Link>
            ) : (
              <p className="font-medium">{application.purchaseId || '-'}</p>
            )}
          </div>
          {application.approvedBy && (
            <div>
              <p className="text-sm text-gray-500">审批人</p>
              <p className="font-medium">{application.approvedBy}</p>
            </div>
          )}
          {application.approvedAt && (
            <div>
              <p className="text-sm text-gray-500">审批时间</p>
              <p className="font-medium">{new Date(application.approvedAt).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-sm text-gray-500">申请原因</p>
          <p className="mt-2 text-gray-700 whitespace-pre-wrap">{application.reason}</p>
        </div>

        {application.attachments && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">附件</p>
            <p className="text-sm text-gray-600 mt-1">{application.attachments}</p>
          </div>
        )}
      </div>
    </div>
  );
}