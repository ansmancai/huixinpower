import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function SiteProjectDetailPage() {
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
        navigate('/site/projects');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  // 判断是否可以编辑/删除
  const canModifyInspection = (inspection: any) => {
    if (!user) return false;
    // 管理员和财务可以操作所有记录
    if (user.role === 'admin' || user.role === 'finance') return true;
    // 现场人员只能操作自己录入的、7天内的记录
    if (user.role === 'site') {
      if (inspection.inspector_id !== user.id) return false;
      const createdDate = new Date(inspection.created_at);
      const now = new Date();
      const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }
    return false;
  };

  // 删除巡检记录
  const handleDeleteInspection = async (inspectionId: string) => {
    if (!confirm('确定要删除这条巡检记录吗？')) return;
    try {
      const { error } = await supabase
        .from('service_inspections')
        .delete()
        .eq('id', inspectionId);
      if (error) throw error;
      // 刷新数据
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
      alert('删除成功');
    } catch (error: any) {
      alert('删除失败: ' + error.message);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
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

  const isOverdue = () => {
    if (!latestInspection || !project) return true;
    const lastDate = new Date(latestInspection.inspection_date);
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

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!project) {
    return <div className="text-center py-12 text-gray-500">项目不存在</div>;
  }

  const overdue = isOverdue();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/site/projects" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回维保项目列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-gray-500">项目编号：{project.code}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/site/projects/${id}/inspection/new`}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            + 新增巡检
          </Link>
        </div>
      </div>

      {/* 项目基本信息 - 只显示服务相关字段 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">项目信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">客户名称</p>
            <p className="font-medium">{project.client || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">服务起始日期</p>
            <p className="font-medium">{formatDate(project.start_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">服务结束日期</p>
            <p className="font-medium">{formatDate(project.end_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">巡检周期</p>
            <p className="font-medium">{project.inspection_cycle === 'monthly' ? '每月' : project.inspection_cycle === 'quarterly' ? '每季度' : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">最近巡检</p>
            <p className="font-medium">
              {latestInspection ? (
                <span className={overdue ? 'text-red-600 font-bold' : 'text-gray-700'}>
                  {formatDate(latestInspection.inspection_date)}
                  {overdue && <span className="ml-1 text-red-500">⚠️ 逾期</span>}
                </span>
              ) : (
                <span className="text-red-500 font-bold">未巡检</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">最近结论</p>
            <p className="font-medium">
              {latestInspection ? (
                <span className={getConclusionColor(latestInspection.conclusion)}>
                  {getConclusionLabel(latestInspection.conclusion)}
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </p>
          </div>
        </div>
        {project.remark && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">项目简介</p>
            <p className="mt-1 text-gray-700">{project.remark}</p>
          </div>
        )}
      </div>

      {/* 巡检记录 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">巡检记录</h2>
          <Link
            to={`/site/projects/${id}/inspection/new`}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"
          >
            + 新增巡检
          </Link>
        </div>
        {inspections.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无巡检记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">巡检日期</th>
                  <th className="px-4 py-2 text-left text-sm">巡检人</th>
                  <th className="px-4 py-2 text-center text-sm">结论</th>
                  <th className="px-4 py-2 text-left text-sm">备注</th>
                  <th className="px-4 py-2 text-center text-sm">操作</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((inv) => {
                  const canModify = canModifyInspection(inv);
                  return (
                    <tr key={inv.id} className="border-t">
                      <td className="px-4 py-2 text-sm">{formatDate(inv.inspection_date)}</td>
                      <td className="px-4 py-2 text-sm">{inv.inspector_id || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${getConclusionColor(inv.conclusion)}`}>
                          {getConclusionLabel(inv.conclusion)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm max-w-[200px] truncate">{inv.remark || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        {canModify && (
                          <div className="flex justify-center gap-2">
                            <Link
                              to={`/site/projects/${id}/inspection/${inv.id}/edit`}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              编辑
                            </Link>
                            <button
                              onClick={() => handleDeleteInspection(inv.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}