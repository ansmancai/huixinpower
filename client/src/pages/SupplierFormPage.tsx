import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';

export default function SupplierFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'equipment',
    contact_person: '',
    phone: '',
    address: '',
    bank: '',
    account: '',
    rating: '',
    remark: '',
  });

  const isEdit = !!id;
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    if (isEdit && canEdit) {
      const loadSupplier = async () => {
        try {
          const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          if (data) {
            setFormData({
              code: data.code || '',
              name: data.name || '',
              category: data.category || 'equipment',
              contact_person: data.contact_person || '',
              phone: data.phone || '',
              address: data.address || '',
              bank: data.bank || '',
              account: data.account || '',
              rating: data.rating || '',
              remark: data.remark || '',
            });
          }
        } catch (error) {
          console.error('加载供应商失败', error);
          navigate('/suppliers');
        }
      };
      loadSupplier();
    }
  }, [id, isEdit, canEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    
    try {
      const submitData: any = {
        code: formData.code,
        name: formData.name,
        category: formData.category,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        address: formData.address || null,
        bank: formData.bank || null,
        account: formData.account || null,
        rating: formData.rating === '' ? null : parseFloat(formData.rating),
        remark: formData.remark || null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error } = await supabase
          .from('suppliers')
          .update(submitData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([{
            ...submitData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          }]);
        if (error) throw error;
      }
      
      navigate('/suppliers');
    } catch (error: any) {
      console.error('保存失败:', error);
      alert(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { value: 'equipment', label: '设备材料' },
    { value: 'installation', label: '安装' },
    { value: 'construction', label: '土建' },
    { value: 'other', label: '生活/其他' },
  ];

  if (!canEdit) {
    return <div className="text-center py-12 text-red-500">无权限操作</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? '编辑供应商' : '新建供应商'}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">供应商编号 *</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">供应商名称 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">类别</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {categoryOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">联系人</label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">联系电话</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">地址</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">开户行</label>
            <input
              type="text"
              value={formData.bank}
              onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">账号</label>
            <input
              type="text"
              value={formData.account}
              onChange={(e) => setFormData({ ...formData, account: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">评级（1-5）</label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
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
            onClick={() => navigate('/suppliers')}
            className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}