import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function MobileSiteInspectionForm() {
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

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('name, code')
        .eq('id', id)
        .single();
      if (projectError) {
        console.error('加载项目失败', projectError);
        navigate('/mobile/site/projects');
        return;
      }
      setProject(projectData);

      if (inspectionId) {
        setIsEdit(true);
        const { data: inspectionData, error } = await supabase
          .from('service_inspections')
          .select('*')
          .eq('id', inspectionId)
          .single();
        if (error) {
          console.error('加载巡检记录失败', error);
          navigate(`/mobile/site/projects/${id}`);
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
        inspector_id: user.id,
        conclusion: formData.conclusion,
        remark: formData.remark || null,
      };

      let error;
      if (isEdit && inspectionId) {
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
        const { error: insertError } = await supabase
          .from('service_inspections')
          .insert([submitData]);
        error = insertError;
      }

      if (error) throw error;

      navigate(`/mobile/site/projects/${id}`);
    } catch (error: any) {
      console.error('保存巡检记录失败:', error);
      alert(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return <div className="flex justify-center items-center h-64 text-gray-500">加载中...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="mb-4">
            <h1 className="text-lg font-bold text-gray-800">
              {isEdit ? '编辑巡检记录' : '新增巡检记录'}
            </h1>
            <p className="text-sm text-gray-500">{project.name}（{project.code}）</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">巡检日期 *</label>
              <input
                type="date"
                required
                value={formData.inspection_date}
                onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">巡检结论 *</label>
              <div className="space-y-2">
                {[
                  { value: 'normal', label: '✅ 正常', desc: '设备运行良好' },
                  { value: 'abnormal', label: '⚠️ 异常', desc: '发现异常但暂不需要维修' },
                  { value: 'need_repair', label: '🔧 待维修', desc: '发现故障或严重隐患' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.conclusion === opt.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="conclusion"
                      value={opt.value}
                      checked={formData.conclusion === opt.value}
                      onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                rows={3}
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="可选填写巡检发现的详细情况..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
              >
                {loading ? '保存中...' : isEdit ? '更新记录' : '保存巡检记录'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/mobile/site/projects/${id}`)}
                className="px-4 py-3 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}