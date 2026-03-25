import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import SearchSelect from '../components/SearchSelect';

export default function PurchaseFormPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<any[]>([]);
 
  const [formData, setFormData] = useState({
    purchase_no: '',
    logistics_status: 'ordered',
    project_id: '',
    supplier_id: '',
    purchase_date: '',
    amount: '',
    content: '',
    remark: '',
  });

  const isEdit = !!id;
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  // 从 URL 参数获取带入的数据
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectId = params.get('projectId');
    const supplierId = params.get('supplierId');
    if (projectId) {
      setFormData(prev => ({ ...prev, project_id: projectId }));
    }
    if (supplierId) {
      setFormData(prev => ({ ...prev, supplier_id: supplierId }));
    }
  }, [location]);

  // 加载项目、供应商选项
  useEffect(() => {
    const loadOptions = async () => {
      const [projRes, supRes] = await Promise.all([
        supabase.from('projects').select('id, name').limit(200),
        supabase.from('suppliers').select('id, name').limit(200),
      ]);
      setProjects(projRes.data || []);
      setSuppliers(supRes.data || []);
    };
    loadOptions();
  }, []);

  useEffect(() => {
    if (isEdit && canEdit) {
      const loadPurchase = async () => {
        try {
          const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .eq('id', id)
            .single();
          if (error) throw error;
          if (data) {
            setFormData({
              purchase_no: data.purchase_no || '',
              logistics_status: data.logistics_status || 'ordered',
              project_id: data.project_id || '',
              supplier_id: data.supplier_id || '',
              purchase_date: data.purchase_date || '',
              amount: data.amount || '',
              content: data.content || '',
              remark: data.remark || '',
            });
            if (data.project_id) {
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', data.project_id)
    .single();
  if (project) {
    setProjectOptions([{ id: project.id, name: project.name }]);
  }
}
if (data.supplier_id) {
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('id', data.supplier_id)
    .single();
  if (supplier) {
    setSupplierOptions([{ id: supplier.id, name: supplier.name }]);
  }
}
          }
        } catch (error) {
          console.error('加载采购单失败', error);
          navigate('/purchases');
        }
      };
      loadPurchase();
    }
  }, [id, isEdit, canEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    
    try {
      const submitData: any = {
        purchase_no: formData.purchase_no,
        logistics_status: formData.logistics_status,
        project_id: formData.project_id || null,
        supplier_id: formData.supplier_id || null,
        purchase_date: formData.purchase_date,
        amount: parseFloat(formData.amount),
        content: formData.content,
        remark: formData.remark || null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error } = await supabase
          .from('purchases')
          .update(submitData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('purchases')
          .insert([{
            ...submitData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          }]);
        if (error) throw error;
      }
      
      navigate('/purchases');
    } catch (error: any) {
      console.error('保存失败:', error);
      alert(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 模糊搜索项目
  const searchProjects = async (keyword: string) => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, code')
      .ilike('name', `%${keyword}%`)
      .limit(20);
    return data || [];
  };

  // 模糊搜索供应商
  const searchSuppliers = async (keyword: string) => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, code')
      .ilike('name', `%${keyword}%`)
      .limit(20);
    return data || [];
  };

  const getProjectName = (id: string) => {
    const p = projects.find(p => p.id === id);
    return p ? p.name : '';
  };

  const getSupplierName = (id: string) => {
    const s = suppliers.find(s => s.id === id);
    return s ? s.name : '';
  };

  if (!canEdit) {
    return <div className="text-center py-12 text-red-500">无权限操作</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? '编辑采购单' : '新建采购单'}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">采购单号 *</label>
            <input
              type="text"
              required
              value={formData.purchase_no}
              onChange={(e) => setFormData({ ...formData, purchase_no: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">物流状态</label>
            <select
              value={formData.logistics_status}
              onChange={(e) => setFormData({ ...formData, logistics_status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="ordered">已下单</option>
              <option value="arrived">已到货</option>
              <option value="pending">待发货</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">所属项目</label>
            <SearchSelect
              value={formData.project_id}
              onChange={(val) => setFormData({ ...formData, project_id: val })}
              onSearch={searchProjects}
              placeholder="选择项目"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">供应商</label>
            <SearchSelect
              value={formData.supplier_id}
              onChange={(val) => setFormData({ ...formData, supplier_id: val })}
              onSearch={searchSuppliers}
              placeholder="选择供应商"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">采购日期 *</label>
            <input
              type="date"
              required
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">采购金额 *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">采购内容 *</label>
            <textarea
              rows={3}
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">备注</label>
            <textarea
              rows={2}
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? '保存中...' : '保存'}
          </button>
          <button type="button" onClick={() => navigate('/purchases')} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}