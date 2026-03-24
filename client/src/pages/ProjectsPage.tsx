import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// 临时测试数据
const testProjects = [
  { id: '1', name: '南城正通达', code: 'HX2026001', status: 'ongoing', client: '广物汽贸', contractAmount: '428000', receivedAmount: 64200, invoicedAmount: 85600 },
  { id: '2', name: '万宏广场', code: 'HX2026002', status: 'ongoing', client: '敏鹰置业', contractAmount: '1130000', receivedAmount: 395500, invoicedAmount: 0 },
  { id: '3', name: '万江4号楼', code: 'HX2023001', status: 'suspended', client: '万江金鳌新村物业', contractAmount: '1318985.47', receivedAmount: 1279415.9, invoicedAmount: 0 },
  { id: '4', name: '大朗阳光城', code: 'HX2023002', status: 'completed', client: '江西景龙', contractAmount: '790000', receivedAmount: 790000, invoicedAmount: 0 },
  { id: '5', name: '道滘阳光城', code: 'HX2023003', status: 'completed', client: '某房地产', contractAmount: '500000', receivedAmount: 500000, invoicedAmount: 0 },
];

const statusMap: Record<string, { label: string; color: string }> = {
  ongoing: { label: '进行中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  pending_payment: { label: '未收齐', color: 'bg-yellow-100 text-yellow-800' },
  suspended: { label: '已暂停', color: 'bg-gray-100 text-gray-800' },
  planning: { label: '规划中', color: 'bg-purple-100 text-purple-800' },
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const projects = testProjects;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  };

  const getUnpaid = (project: any) => {
    const contract = parseFloat(project.contractAmount || '0');
    const received = project.receivedAmount || 0;
    return contract - received;
  };

  const getUninvoiced = (project: any) => {
    const contract = parseFloat(project.contractAmount || '0');
    const invoiced = project.invoicedAmount || 0;
    return contract - invoiced;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">项目管理</h1>
        <div className="flex gap-2">
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            📥 导出数据
          </button>
          {canEdit && (
            <button
              onClick={() => navigate('/projects/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + 新建项目
            </button>
          )}
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="搜索项目名称、项目编号、甲方..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg"
        />
        <select className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="all">全部状态</option>
          <option value="ongoing">进行中</option>
          <option value="completed">已完成</option>
          <option value="pending_payment">未收齐</option>
          <option value="suspended">已暂停</option>
          <option value="planning">规划中</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">项目编号</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">项目名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">甲方</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">合同价</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">已收款</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">未收款</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">已开票</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">未开票</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{project.code}</td>
                <td className="px-4 py-3">
                  <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                    {project.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">{project.client || '-'}</td>
                <td className="px-4 py-3 text-right text-sm">{formatAmount(parseFloat(project.contractAmount))}</td>
                <td className="px-4 py-3 text-right text-sm text-green-600">{formatAmount(project.receivedAmount)}</td>
                <td className="px-4 py-3 text-right text-sm text-red-600">{formatAmount(getUnpaid(project))}</td>
                <td className="px-4 py-3 text-right text-sm text-blue-600">{formatAmount(project.invoicedAmount)}</td>
                <td className="px-4 py-3 text-right text-sm text-orange-600">{formatAmount(getUninvoiced(project))}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${statusMap[project.status]?.color || 'bg-gray-100'}`}>
                    {statusMap[project.status]?.label || project.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <Link to={`/projects/${project.id}`} className="text-blue-600 hover:text-blue-800 text-sm">查看</Link>
                    {canEdit && <Link to={`/projects/${project.id}/edit`} className="text-blue-600 hover:text-blue-800 text-sm">编辑</Link>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}