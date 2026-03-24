import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function PaymentApplicationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('all');
  const pageSize = 20;

  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const canApprove = user?.role === 'admin' || user?.role === 'finance';

  const loadApplications = async () => {
    setLoading(true);
    try {
      const result = await api.paymentApplications.list({ page, pageSize, projectId, status });
      setApplications(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('加载付款申请失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [page, projectId, status]);

  const handleApprove = async (id: string, status: 'approved' | 'rejected') => {
    if (!confirm(`确定要${status === 'approved' ? '通过' : '驳回'}这笔付款申请吗？`)) return;
    try {
      await api.paymentApplications.approve(id, status);
      loadApplications();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handlePaid = async (id: string) => {
    if (!confirm('确定标记为已付款吗？')) return;
    try {
      await api.paymentApplications.approve(id, 'paid');
      loadApplications();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: string, no: string) => {
    if (!confirm(`确定要删除付款申请 "${no}" 吗？`)) return;
    try {
      await api.paymentApplications.delete(id);
      loadApplications();
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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">付款申请</h1>
        {canEdit && (
          <button
            onClick={() => navigate('/payment-applications/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + 新建付款申请
          </button>
        )}
      </div>

      {/* 搜索筛选 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="项目ID"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setPage(1);
          }}
          className="w-48 px-3 py-2 border border-gray-300 rounded-lg"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">全部状态</option>
          <option value="pending">待审批</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
          <option value="paid">已付款</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">申请编号</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">项目ID</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">供应商ID</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">金额</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">原因</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">状态</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <Link to={`/payment-applications/${app.id}`} className="text-blue-600 hover:underline">
                        {app.applicationNo}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm">{app.projectId || '-'}</td>
                    <td className="px-6 py-4 text-sm">{app.supplierId || '-'}</td>
                    <td className="px-6 py-4 text-right font-medium text-red-600">
                      ¥{app.amount}
                    </td>
                    <td className="px-6 py-4 text-sm max-w-[200px] truncate">{app.reason}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${statusMap[app.status]?.color || 'bg-gray-100'}`}>
                        {statusMap[app.status]?.label || app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2 flex-wrap">
                        {canApprove && app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(app.id, 'approved')}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              通过
                            </button>
                            <button
                              onClick={() => handleApprove(app.id, 'rejected')}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              驳回
                            </button>
                          </>
                        )}
                        {canEdit && app.status === 'approved' && (
                          <button
                            onClick={() => handlePaid(app.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            标记付款
                          </button>
                        )}
                        {canEdit && (
                          <Link
                            to={`/payment-applications/${app.id}/edit`}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            编辑
                          </Link>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(app.id, app.applicationNo)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}