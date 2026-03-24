import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPurchases, setRelatedPurchases] = useState<any[]>([]);
  const [relatedTransactions, setRelatedTransactions] = useState<any[]>([]);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [projectData, purchasesData, transactionsData] = await Promise.all([
          api.projects.get(id),
          api.purchases.list({ projectId: id, pageSize: 100 }),
          api.transactions.list({ projectId: id, pageSize: 100 }),
        ]);
        setProject(projectData);
        setRelatedPurchases(purchasesData.data);
        setRelatedTransactions(transactionsData.data);
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
      await api.projects.delete(id!);
      navigate('/projects');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    planning: { label: '规划中', color: 'bg-yellow-100 text-yellow-800' },
    ongoing: { label: '进行中', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
    suspended: { label: '暂停', color: 'bg-gray-100 text-gray-800' },
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!project) {
    return <div className="text-center py-12 text-gray-500">项目不存在</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/projects" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回项目列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-gray-500">编号：{project.code}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/projects/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑项目
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                删除项目
              </button>
            )}
          </div>
        )}
      </div>

      {/* 项目基本信息 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">基本信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">项目状态</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${statusMap[project.status]?.color || 'bg-gray-100'}`}>
              {statusMap[project.status]?.label || project.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">预算</p>
            <p className="font-medium">{project.budget ? `¥${project.budget}` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">实际成本</p>
            <p className="font-medium">{project.actualCost ? `¥${project.actualCost}` : '¥0'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">项目经理</p>
            <p className="font-medium">{project.managerId || '未指定'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">开始日期</p>
            <p className="font-medium">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">结束日期</p>
            <p className="font-medium">{project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}</p>
          </div>
        </div>
        {project.description && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">项目描述</p>
            <p className="mt-1 text-gray-700">{project.description}</p>
          </div>
        )}
      </div>

      {/* 相关采购 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">相关采购单</h2>
          {canEdit && (
            <Link
              to={`/purchases/new?projectId=${id}`}
              className="text-blue-600 text-sm hover:underline"
            >
              + 新增采购
            </Link>
          )}
        </div>
        {relatedPurchases.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无采购记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">采购单号</th>
                  <th className="px-4 py-2 text-left text-sm">名称</th>
                  <th className="px-4 py-2 text-right text-sm">金额</th>
                  <th className="px-4 py-2 text-center text-sm">状态</th>
                </tr>
              </thead>
              <tbody>
                {relatedPurchases.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2">
                      <Link to={`/purchases/${p.id}`} className="text-blue-600 hover:underline">
                        {p.purchaseNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{p.name}</td>
                    <td className="px-4 py-2 text-right">{p.totalAmount ? `¥${p.totalAmount}` : '-'}</td>
                    <td className="px-4 py-2 text-center">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 相关交易 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">相关收付款</h2>
          {canEdit && (
            <Link
              to={`/transactions/new?projectId=${id}`}
              className="text-blue-600 text-sm hover:underline"
            >
              + 新增交易
            </Link>
          )}
        </div>
        {relatedTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无交易记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">交易编号</th>
                  <th className="px-4 py-2 text-left text-sm">类型</th>
                  <th className="px-4 py-2 text-right text-sm">金额</th>
                  <th className="px-4 py-2 text-center text-sm">状态</th>
                  <th className="px-4 py-2 text-left text-sm">交易日期</th>
                </tr>
              </thead>
              <tbody>
                {relatedTransactions.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2">
                      <Link to={`/transactions/${t.id}`} className="text-blue-600 hover:underline">
                        {t.transactionNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span className={t.type === 'receipt' ? 'text-green-600' : 'text-red-600'}>
                        {t.type === 'receipt' ? '收款' : '付款'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">¥{t.amount}</td>
                    <td className="px-4 py-2 text-center">{t.status}</td>
                    <td className="px-4 py-2">{new Date(t.transactionDate).toLocaleDateString()}</td>
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