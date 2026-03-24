import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';

export default function ProjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'ongoing',
    client: '',
    contractor: '汇信电力',
    contract_no: '',
    contract_amount: '',
    start_date: '',
    end_date: '',
    remark: '',
  });

  const isEdit = !!id;
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    if (isEdit && canEdit) {
      const loadProject = async () => {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          if (data) {
            setFormData({
              name: data.name || '',
              code: data.code || '',
              status: data.status || 'ongoing',
              client: data.client || '',
              contractor: data.contractor || '汇信电力',
              contract_no: data.contract_no || '',
              contract_amount: data.contract_amount || '',
              start_date: data.start_date || '',
              end_date: data.end_date || '',
              remark: data.remark || '',
            });
          }
        } catch (error) {
          console.error('加载项目失败', error);
          navigate('/projects');
        }
      };
      loadProject();
    }
  }, [id, isEdit, canEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    
    try {
      // 准备提交数据：空字符串转为 null，数字字段转为数字
      const submitData: any = {
        name: formData.name,
        code: formData.code,
        status: formData.status,
        client: formData.client || null,
        contractor: formData.contractor || '汇信电力',
        contract_no: formData.contract_no || null,
        contract_amount: formData.contract_amount === '' ? null : parseFloat(formData.contract_amount),
        start_date: formData.start_date === '' ? null : formData.start_date,
        end_date: formData.end_date === '' ? null : formData.end_date,
        remark: formData.remark || null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error } = await supabase
          .from('projects')
          .update(submitData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([{
            ...submitData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          }]);
        if (error) throw error;
      }
      
      navigate('/projects');
    } catch (error: any) {
      console.error('保存失败:', error);
      alert(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) {
    return <div className="text-center py-12 text-red-500">无权限操作</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? '编辑项目' : '新建项目'}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">项目名称 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">项目编号 *</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">状态</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="ongoing">进行中</option>
              <option value="completed">已完成</option>
              <option value="pending_payment">未收齐</option>
              <option value="suspended">已暂停</option>
              <option value="planning">规划中</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">甲方</label>
            <input
              type="text"
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">乙方</label>
            <input
              type="text"
              value={formData.contractor}
              onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">合同编号</label>
            <input
              type="text"
              value={formData.contract_no}
              onChange={(e) => setFormData({ ...formData, contract_no: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">合同金额</label>
            <input
              type="number"
              step="0.01"
              value={formData.contract_amount}
              onChange={(e) => setFormData({ ...formData, contract_amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">开工日期</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">完工日期</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">备注</label>
            <textarea
              rows={3}
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}