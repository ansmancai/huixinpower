import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function MobileSiteProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  const [latestInspection, setLatestInspection] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: projectData, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setProject(projectData);

        const { data: inspectionsData } = await supabase
          .from('service_inspections')
          .select('*')
          .eq('project_id', id)
          .order('inspection_date', { ascending: false });
        setInspections(inspectionsData || []);

        if (inspectionsData && inspectionsData.length > 0) {
          setLatestInspection(inspectionsData[0]);
        }
      } catch (error) {
        console.error('加载项目详情失败', error);
        navigate('/mobile/site/projects');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleDeleteInspection = async (inspectionId: string) => {
    if (!confirm('确定要删除这条巡检记录吗？')) return;
    try {
      const { error } = await supabase
        .from('service_inspections')
        .delete()
        .eq('id', inspectionId);
      if (error) throw error;
      const { data: inspectionsData } = await supabase
        .from('service_inspections')
        .select('*')
        .eq('project_id', id)
        .order('inspection_date', { ascending: false });
      setInspections(inspectionsData || []);
      if (inspectionsData && inspectionsData.length > 0) {
        setLatestInspection(inspectionsData[0]);
      } else {
        setLatestInspection(null);
      }
    } catch (error: any) {
      alert('删除失败: ' + error.message);
    }
  };

  const canModifyInspection = (inspection: any) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'finance') return true;
    if (user.role === 'site') {
      if (inspection.inspector_id !== user.id && inspection.inspector_name !== user.name) return false;
      const createdDate = new Date(inspection.created_at);
      const now = new Date();
      const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }
    return false;
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

  const getConclusionColor = (conclusion: string) => {
    const map: Record<string, string> = {
      normal: 'bg-green-100 text-green-800',
      abnormal: 'bg-yellow-100 text-yellow-800',
      need_repair: 'bg-red-100 text-red-800',
    };
    return map[conclusion] || 'bg-gray-100';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-500">加载中...</div>;
  }

  if (!project) {
    return <div className="text-center py-12 text-gray-500">项目不存在</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h1 className="text-lg font-bold text-gray-800">{project.name}</h1>
          <p className="text-sm text-gray-500">{project.code}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">客户</span>
              <p className="font-medium">{project.client || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">服务期限</span>
              <p className="font-medium">
                {formatDate(project.start_date)} ~ {formatDate(project.end_date)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">巡检周期</span>
              <p className="font-medium">
                {project.inspection_cycle === 'monthly' ? '每月' : project.inspection_cycle === 'quarterly' ? '每季度' : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">最近巡检</span>
              <p className="font-medium">
                {latestInspection ? formatDate(latestInspection.inspection_date) : '未巡检'}
              </p>
            </div>
          </div>
          {project.remark && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">项目简介</p>
              <p className="text-sm text-gray-700 mt-0.5">{project.remark}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">巡检记录</h2>
          {inspections.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">暂无巡检记录</p>
          ) : (
            <div className="space-y-2">
              {inspections.map((inv) => {
                const canModify = canModifyInspection(inv);
                return (
                  <div key={inv.id} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{formatDate(inv.inspection_date)}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getConclusionColor(inv.conclusion)}`}>
                          {getConclusionLabel(inv.conclusion)}
                        </span>
                      </div>
                      {canModify && (
                        <div className="flex gap-2 text-xs">
                          <Link
                            to={`/mobile/site/projects/${id}/inspection/${inv.id}/edit`}
                            className="text-blue-600 hover:underline"
                          >
                            编辑
                          </Link>
                          <button
                            onClick={() => handleDeleteInspection(inv.id)}
                            className="text-red-600 hover:underline"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                    {inv.remark && (
                      <p className="text-xs text-gray-500 mt-0.5">{inv.remark}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">巡检人：{inv.inspector_name || inv.inspector_id || '-'}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <Link
          to={`/mobile/site/projects/${id}/inspection/new`}
          className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-medium text-sm hover:bg-blue-700 active:bg-blue-800"
        >
          + 新增巡检
        </Link>
      </div>
    </div>
  );
}