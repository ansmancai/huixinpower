import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function SiteInspectionForm() {
  const { id, inspectionId } = useParams<{ id: string; inspectionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    conclusion: 'normal',
    remark: '',
  });

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      // 加载项目信息
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('name, code')
        .eq('id', id)
        .single();
      if (projectError) {
        console.error('加载项目失败', projectError);
        navigate('/site/projects');
        return;
      }
      setProject(projectData);

      // 如果是编辑模式，加载巡检记录
      if (inspectionId) {
        setIsEdit(true);
        const { data: inspectionData, error } = await supabase
          .from('service_inspections')
          .select('*')
          .eq('id', inspectionId)
          .single();
        if (error) {
          console.error('加载巡检记录失败', error);
          navigate(`/site/projects/${id}`);
          return;
        }
        setFormData({
          inspection_date: inspectionData.inspection_date || '',
          conclusion: inspectionData.conclusion || 'normal',
          remark: inspectionData.remark || '',
        });
      }
    };
    loadData();
  }, [id, inspectionId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    setLoading(true);

    try {
      const submitData = {
        project_id: id,
        inspection_date: formData.inspection_date,
        inspector_id: user.name,
        conclusion: formData.conclusion,
        remark: formData.remark || null,
      };

      let error;
      if (isEdit && inspectionId) {
        // 编辑：只更新部分字段，保留 inspector_id 不变
        const { error: updateError } = await supabase
          .from('service_inspections')
          .update({
            inspection_date: formData.inspection_date,
            conclusion: formData.conclusion,
            remark: formData.remark || null,
          })
          .eq('id', inspectionId);
        error = updateError;
      } else {
        // 新建
        const { error: insertError } = await supabase
          .from('service_inspections')
          .insert([submitData]);
        error = insertError;
      }

      if (error) throw error;

      navigate(`/site/projects/${id}`);
    } catch (error: any) {
      console.error('保存巡检记录失败:', error);
      alert(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to={`/site/projects/${id}`} className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回项目详情
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEdit ? '编辑巡检记录' : '新增巡检记录'}
          </h1>
          <p className="text-gray-500">{project.name}（{project.code}）</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">巡检日期 *</label>
          <input
            type="date"
            required
            value={formData.inspection_date}
            onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">巡检结论 *</label>
          <select
            required
            value={formData.conclusion}
            onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="normal">✅ 正常</option>
            <option value="abnormal">⚠️ 异常（需持续观察）</option>
            <option value="need_repair">🔧 待维修（需安排维修）</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            <span className="text-green-600">正常</span>：设备运行良好<br />
            <span className="text-yellow-600">异常</span>：发现异常但暂不需要维修<br />
            <span className="text-red-600">待维修</span>：发现故障或严重隐患，需安排维修
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">备注</label>
          <textarea
            rows={3}
            value={formData.remark}
            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            placeholder="可选填写巡检发现的详细情况..."
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : isEdit ? '更新记录' : '保存巡检记录'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/site/projects/${id}`)}
            className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}