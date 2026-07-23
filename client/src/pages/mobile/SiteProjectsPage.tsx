import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../api/client';

export default function MobileSiteProjectsPage() {
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

  // 防抖搜索
  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      loadProjects(false);
    }, 500);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [keyword]);

  // 判断巡检是否逾期
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

  // 获取项目状态
  const getProjectStatus = (project: any) => {
    const now = new Date();
    const start = project.start_date ? new Date(project.start_date) : null;
    const end = project.end_date ? new Date(project.end_date) : null;

    if (!start) return { label: '待开始', color: 'bg-gray-200 text-gray-600' };
    if (start > now) return { label: '待开始', color: 'bg-gray-200 text-gray-600' };
    if (end && end < now) return { label: '已结束', color: 'bg-gray-300 text-gray-500' };
    return { label: '进行中', color: 'bg-blue-100 text-blue-700' };
  };

  const getConclusionLabel = (conclusion: string) => {
    const map: Record<string, string> = {
      normal: '正常',
      abnormal: '异常',
      need_repair: '待维修',
    };
    return map[conclusion] || conclusion;
  };

  const getConclusionColor = (conclusion: string) => {
    const map: Record<string, string> = {
      normal: 'text-green-600',
      abnormal: 'text-yellow-600',
      need_repair: 'text-red-600',
    };
    return map[conclusion] || 'text-gray-400';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-500">加载中...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶部固定搜索框 */}
      <div className="sticky top-0 z-10 bg-white px-4 py-3 shadow-sm">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="搜索项目名称、客户..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 ml-1">输入后稍等自动搜索</p>
      </div>

      {/* 项目列表 */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">暂无维保项目</div>
        ) : (
          <div className="space-y-1.5">
            {projects.map((project) => {
              const status = getProjectStatus(project);
              const overdue = isOverdue(project);
              const latest = project.latestInspection;
              const conclusionLabel = latest ? getConclusionLabel(latest.conclusion) : '未巡检';
              const conclusionColor = latest ? getConclusionColor(latest.conclusion) : 'text-gray-400';

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/mobile/site/projects/${project.id}`)}
                  className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{project.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{project.client || '—'}</p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 ml-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        {overdue && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                            逾期
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className={`font-medium ${conclusionColor}`}>{conclusionLabel}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-400">{latest ? formatDate(latest.inspection_date) : '未巡检'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}