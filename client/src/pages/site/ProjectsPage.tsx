import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../api/client';

export default function SiteProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [searchTimer, setSearchTimer] = useState<any>(null);

  const loadProjects = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('project_type', 'service');
      
      if (keyword) {
        query = query.or(`name.ilike.%${keyword}%,client.ilike.%${keyword}%,code.ilike.%${keyword}%`);
      }
      
      const { data, error } = await query.order('code', { ascending: false });
      if (error) throw error;
      
      const projectIds = data?.map(p => p.id) || [];
      if (projectIds.length > 0) {
        const { data: inspections } = await supabase
          .from('service_inspections')
          .select('project_id, inspection_date, conclusion')
          .in('project_id', projectIds)
          .order('inspection_date', { ascending: false });
        
        const latestInspectionMap: Record<string, any> = {};
        inspections?.forEach(ins => {
          if (!latestInspectionMap[ins.project_id]) {
            latestInspectionMap[ins.project_id] = ins;
          }
        });
        
        data?.forEach(p => {
          p.latestInspection = latestInspectionMap[p.id] || null;
        });
      }
      
      setProjects(data || []);
    } catch (error) {
      console.error('加载维保项目失败', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    loadProjects(true);
  }, []);

  // 防抖搜索：2000ms 延迟，搜索时不触发 loading 状态
  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      loadProjects(false);
    }, 2000);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [keyword]);

  const isOverdue = (project: any) => {
    if (!project.latestInspection) return true;
    const lastDate = new Date(project.latestInspection.inspection_date);
    const now = new Date();
    
    if (project.inspection_cycle === 'monthly') {
      const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 30;
    } else if (project.inspection_cycle === 'quarterly') {
      const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 90;
    }
    return false;
  };

  const getProjectStatus = (project: any) => {
    const now = new Date();
    const start = project.start_date ? new Date(project.start_date) : null;
    const end = project.end_date ? new Date(project.end_date) : null;
    
    if (!start) return { label: '待开始', color: 'bg-gray-100 text-gray-800' };
    if (start > now) return { label: '待开始', color: 'bg-gray-100 text-gray-800' };
    if (end && end < now) return { label: '已结束', color: 'bg-gray-300 text-gray-600' };
    return { label: '进行中', color: 'bg-blue-100 text-blue-800' };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getConclusionLabel = (conclusion: string) => {
    const map: Record<string, string> = {
      normal: '✅ 正常',
      abnormal: '⚠️ 异常',
      need_repair: '🔧 待维修',
    };
    return map[conclusion] || conclusion;
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">维保项目管理</h1>
        <div className="text-sm text-gray-500">
          {user?.name}（现场人员）
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <input
          type="text"
          placeholder="搜索项目名称、客户名称、项目编号..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">输入后稍等 2 秒自动搜索</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">项目编号</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">项目名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">客户</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">最近巡检</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">巡检结论</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无维保项目
                </td>
              </tr>
            ) : (
              projects.map((project) => {
                const status = getProjectStatus(project);
                const overdue = isOverdue(project);
                const latest = project.latestInspection;
                return (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{project.code}</td>
                    <td className="px-4 py-3">
                      <Link to={`/site/projects/${project.id}`} className="text-blue-600 hover:underline">
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{project.client || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {latest ? (
                        <span className={overdue ? 'text-red-600 font-bold' : 'text-gray-700'}>
                          {formatDate(latest.inspection_date)}
                          {overdue && <span className="ml-1 text-red-500">⚠️</span>}
                        </span>
                      ) : (
                        <span className="text-red-500 font-bold">未巡检</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {latest ? (
                        <span className={
                          latest.conclusion === 'normal' ? 'text-green-600' :
                          latest.conclusion === 'abnormal' ? 'text-yellow-600' :
                          'text-red-600'
                        }>
                          {getConclusionLabel(latest.conclusion)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/site/projects/${project.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        查看详情
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}