import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import SearchSelect from '../components/SearchSelect';

export default function TransactionFormPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [matchingPurchases, setMatchingPurchases] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    date: '',
    type: 'payment',
    amount: '',
    payment_method: 'bank',
    project_id: '',
    supplier_id: '',
    purchase_id: '',
    remark: '',
  });
  // 用于显示已选中的名称
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<any[]>([]);
  const [purchaseOptions, setPurchaseOptions] = useState<any[]>([]);

  const isEdit = !!id;
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  // 从 URL 参数获取带入的数据
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectId = params.get('projectId');
    const supplierId = params.get('supplierId');
    const purchaseId = params.get('purchaseId');
    if (projectId) setFormData(prev => ({ ...prev, project_id: projectId }));
    if (supplierId) setFormData(prev => ({ ...prev, supplier_id: supplierId }));
    if (purchaseId) setFormData(prev => ({ ...prev, purchase_id: purchaseId }));
  }, [location]);

  // 加载项目和供应商列表
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

  // 当项目或供应商变化时，自动加载匹配的采购
  useEffect(() => {
    const loadMatchingPurchases = async () => {
      if (!formData.project_id || !formData.supplier_id) {
        setMatchingPurchases([]);
        return;
      }
      
      const { data } = await supabase
        .from('purchases')
        .select('id, purchase_no, content, amount, supplier_id, suppliers(name)')
        .eq('project_id', formData.project_id)
        .eq('supplier_id', formData.supplier_id)
        .order('purchase_date', { ascending: false });
      
      setMatchingPurchases(data?.map(p => ({
        id: p.id,
        name: `${p.purchase_no} - ${p.content} (¥${p.amount})`,
        supplier_name: p.suppliers?.name || '',
        supplier_id: p.supplier_id,
        amount: p.amount,
      })) || []);
    };
    
    loadMatchingPurchases();
  }, [formData.project_id, formData.supplier_id]);

  useEffect(() => {
  if (isEdit && canEdit) {
    const loadTransaction = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (data) {
          setFormData({
            date: data.date || '',
            type: data.type || 'payment',
            amount: data.amount || '',
            payment_method: data.payment_method || 'bank',
            project_id: data.project_id || '',
            supplier_id: data.supplier_id || '',
            purchase_id: data.purchase_id || '',
            remark: data.remark || '',
          });
          
          // 加载选中的项目名称和供应商名称
          if (data.project_id) {
            const { data: project } = await supabase
              .from('projects')
              .select('id, name')
              .eq('id', data.project_id)
              .single();
            if (project) {
              setProjectOptions([{ id: project.id, name: project.name }]);
              setSelectedProjectName(project.name);
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
              setSelectedSupplierName(supplier.name);
            }
          }
          if (data.purchase_id) {
            const { data: purchase } = await supabase
              .from('purchases')
              .select('id, purchase_no, content, amount')
              .eq('id', data.purchase_id)
              .single();
            if (purchase) {
              setPurchaseOptions([{
                id: purchase.id,
                name: `${purchase.purchase_no} - ${purchase.content} (¥${purchase.amount})`,
              }]);
            }
          }
        }  // 👈 关闭 if (data)
      } catch (error) {
        console.error('加载交易记录失败', error);
        navigate('/transactions');
      }
    };
    loadTransaction();
  }
}, [id, isEdit, canEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    
    try {
      let amount = parseFloat(formData.amount);
      if (formData.type === 'payment' && amount > 0) {
        amount = -amount;
      }
      
      const submitData: any = {
        date: formData.date,
        type: formData.type,
        amount: amount,
        payment_method: formData.payment_method,
        project_id: formData.project_id || null,
        supplier_id: formData.supplier_id || null,
        purchase_id: formData.purchase_id || null,
        remark: formData.remark || null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error } = await supabase
          .from('transactions')
          .update(submitData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([{
            ...submitData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          }]);
        if (error) throw error;
      }
      
      navigate('/transactions');
    } catch (error: any) {
      console.error('保存失败:', error);
      alert(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const searchProjects = async (keyword: string) => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, code')
      .ilike('name', `%${keyword}%`)
      .limit(20);
    return data || [];
  };

  const searchSuppliers = async (keyword: string) => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, code')
      .ilike('name', `%${keyword}%`)
      .limit(20);
    return data || [];
  };

  const paymentMethods = [
    { value: 'bank', label: '银行转账' },
    { value: 'cash', label: '现金' },
    { value: 'wechat', label: '微信' },
    { value: 'alipay', label: '支付宝' },
    { value: 'draft', label: '汇票' },
    { value: 'check', label: '支票' },
    { value: 'other', label: '其他' },
  ];

  if (!canEdit) {
    return <div className="text-center py-12 text-red-500">无权限操作</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? '编辑收付款' : '新建收付款'}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">日期 *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">类型 *</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="payment">付款</option>
              <option value="receipt">收款</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">金额 *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">支付方式</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">关联项目</label>
            <SearchSelect
              value={formData.project_id}
              initialOptions={projectOptions}
              onChange={(val) => {
                setFormData({ ...formData, project_id: val, purchase_id: '' });
                const proj = projects.find(p => p.id === val);
                setSelectedProjectName(proj?.name || '');
              }}
              onSearch={searchProjects}
              placeholder="选择项目"
              displayName={selectedProjectName} 
            />
            {selectedProjectName && (
              <p className="text-xs text-gray-500 mt-1">已选：{selectedProjectName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">关联供应商</label>
            <SearchSelect
              value={formData.supplier_id}
              initialOptions={supplierOptions}
              onChange={(val) => {
                setFormData({ ...formData, supplier_id: val, purchase_id: '' });
                const sup = suppliers.find(s => s.id === val);
                setSelectedSupplierName(sup?.name || '');
              }}
              onSearch={searchSuppliers}
              placeholder="选择供应商"
              displayName={selectedSupplierName}
            />
            {selectedSupplierName && (
              <p className="text-xs text-gray-500 mt-1">已选：{selectedSupplierName}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">关联采购</label>
            {formData.project_id && formData.supplier_id ? (
              matchingPurchases.length > 0 ? (
                <SearchSelect
  value={formData.purchase_id}
  onChange={(val, option) => {
    setFormData({
      ...formData,
      purchase_id: val,
      supplier_name: option?.supplier_name || '',
      supplier_id: option?.supplier_id || '',
      amount: option?.amount || formData.amount,
    });
  }}
  onSearch={handlePurchaseSearch}
  placeholder="选择采购单"
  initialOptions={purchaseOptions}
/>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded border">
                  该供应商在此项目下暂无采购记录
                </div>
              )
            ) : (
              <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded border">
                请先选择项目和供应商，系统将自动列出匹配的采购单
              </div>
            )}
            {formData.purchase_id && (
              <p className="text-xs text-green-600 mt-1">✅ 已关联采购单</p>
            )}
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
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? '保存中...' : '保存'}
          </button>
          <button type="button" onClick={() => navigate('/transactions')} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}