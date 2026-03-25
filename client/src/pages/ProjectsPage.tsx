import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import ExportButton from '../components/ExportButton';
import ImportModal from '../components/ImportModal';

// 供应商搜索函数（用于导入时的关联转换）
async function searchSuppliers(keyword: string) {
  const { data } = await supabase
    .from('suppliers')
    .select('id, name, code')
    .ilike('name', `%${keyword}%`)
    .limit(10);
  return data || [];
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTimer, setSearchTimer] = useState<any>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const canExport = user?.role === 'admin' || user?.role === 'finance';

  const loadProjects = async () => {
    setLoading(true);
    try {
      let query = supabase.from('projects').select('*');
      
      if (keyword) {
        query = query.or(`name.ilike.%${keyword}%,code.ilike.%${keyword}%`);
      }
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      // 获取关联的收付款和发票数据用于计算已收款/已开票
      const projectIds = data?.map(p => p.id) || [];
      if (projectIds.length > 0) {
        const { data: transactions } = await supabase
          .from('transactions')
          .select('project_id, amount, type')
          .in('project_id', projectIds);
        
        const { data: invoices } = await supabase
          .from('invoices')
          .select('project_id, total_amount')
          .in('project_id', projectIds);
        
        const receiptMap: Record<string, number> = {};
        const invoiceMap: Record<string, number> = {};
        
        transactions?.forEach(t => {
          if (t.type === 'receipt') {
            receiptMap[t.project_id] = (receiptMap[t.project_id] || 0) + parseFloat(t.amount);
          }
        });
        
        invoices?.forEach(i => {
          invoiceMap[i.project_id] = (invoiceMap[i.project_id] || 0) + parseFloat(i.total_amount);
        });
        
        data?.forEach(p => {
          p.receivedAmount = receiptMap[p.id] || 0;
          p.invoicedAmount = invoiceMap[p.id] || 0;
        });
      }
      
      setProjects(data || []);
    } catch (error) {
      console.error('加载项目失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [status]);

  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      loadProjects();
    }, 300);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除项目 "${name}" 吗？`)) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      loadProjects();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    ongoing: { label: '进行中', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
    pending_payment: { label: '未收齐', color: 'bg-yellow-100 text-yellow-800' },
    suspended: { label: '已暂停', color: 'bg-gray-100 text-gray-800' },
    planning: { label: '规划中', color: 'bg-purple-100 text-purple-800' },
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  };

  // 导入列配置
  const importColumns = [
    { key: 'name', label: '项目名称', required: true },
    { key: 'code', label: '项目编号', required: true },
    { key: 'status', label: '项目状态', required: false },
    { key: 'client', label: '甲方', required: false },
    { key: 'contractor', label: '乙方', required: false },
    { key: 'contract_no', label: '合同编号', required: false },
    { key: 'contract_amount', label: '合同金额', required: false },
    { key: 'start_date', label: '开工日期', required: false },
    { key: 'end_date', label: '完工日期', required: false },
    { key: 'remark', label: '备注', required: false },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">项目管理</h1>
        <div className="flex gap-2">
          {canExport && (
            <ExportButton module="projects" moduleName="项目" filter={{ status: status !== 'all' ? status : undefined }} />
          )}
          {canEdit && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                📥 导入数据
              </button>
              <button
                onClick={() => navigate('/projects/new')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + 新建项目
              </button>
            </>
          )}
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="搜索项目名称、项目编号、甲方..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">全部状态</option>
          <option value="ongoing">进行中</option>
          <option value="completed">已完成</option>
          <option value="pending_payment">未收齐</option>
          <option value="suspended">已暂停</option>
          <option value="planning">规划中</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
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
              {projects.map((project) => {
                const contractAmount = parseFloat(project.contract_amount || '0');
                const receivedAmount = project.receivedAmount || 0;
                const invoicedAmount = project.invoicedAmount || 0;
                return (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{project.code}</td>
                    <td className="px-4 py-3">
                      <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{project.client || '-'}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatAmount(contractAmount)}</td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">{formatAmount(receivedAmount)}</td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">{formatAmount(contractAmount - receivedAmount)}</td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600">{formatAmount(invoicedAmount)}</td>
                    <td className="px-4 py-3 text-right text-sm text-orange-600">{formatAmount(contractAmount - invoicedAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${statusMap[project.status]?.color || 'bg-gray-100'}`}>
                        {statusMap[project.status]?.label || project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Link to={`/projects/${project.id}`} className="text-blue-600 hover:text-blue-800 text-sm">查看</Link>
                        {canEdit && (
                          <Link to={`/projects/${project.id}/edit`} className="text-blue-600 hover:text-blue-800 text-sm">编辑</Link>
                        )}
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(project.id, project.name)} className="text-red-600 hover:text-red-800 text-sm">删除</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {projects.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无项目数据</div>
          )}
        </div>
      )}

      {/* 导入弹窗 */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          loadProjects();
          setShowImportModal(false);
        }}
        module="projects"
        moduleName="项目"
        columns={importColumns}
        transformRow={async (row) => {
          // 处理状态值转换
          const statusMap: Record<string, string> = {
            '进行中': 'ongoing',
            '已完成': 'completed',
            '未收齐': 'pending_payment',
            '已暂停': 'suspended',
            '规划中': 'planning',
          };
          if (row.status && statusMap[row.status]) {
            row.status = statusMap[row.status];
          }
          return row;
        }}
      />
    </div>
  );
}