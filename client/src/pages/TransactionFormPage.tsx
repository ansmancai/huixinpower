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
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<any[]>([]);
  const [purchaseOptions, setPurchaseOptions] = useState<any[]>([]);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [matchingPurchases, setMatchingPurchases] = useState<any[]>([]);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [originalPurchaseId, setOriginalPurchaseId] = useState('');
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

  const isEdit = !!id;
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  // 生成付款编号
  const generateReceiptNo = async () => {
    const year = new Date().getFullYear().toString();
    const { data } = await supabase
      .from('transactions')
      .select('receipt_no')
      .eq('type', 'payment')
      .like('receipt_no', `HXXT${year}%`)
      .order('receipt_no', { ascending: false })
      .limit(1);
    
    let nextNum = 1;
    if (data && data.length > 0) {
      const match = data[0].receipt_no.match(/SF\d{4}(\d{4})/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    return `SF${year}${nextNum.toString().padStart(4, '0')}`;
  };

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
            setOriginalAmount(Math.abs(parseFloat(data.amount)));
            setOriginalPurchaseId(data.purchase_id || '');
            
            if (data.project_id) {
              const { data: project } = await supabase
                .from('projects')
                .select('name')
                .eq('id', data.project_id)
                .single();
              if (project) {
                setProjectOptions([{ id: data.project_id, name: project.name }]);
                setSelectedProjectName(project.name);
              }
            }
            
            if (data.supplier_id) {
              const { data: supplier } = await supabase
                .from('suppliers')
                .select('name')
                .eq('id', data.supplier_id)
                .single();
              if (supplier) {
                setSupplierOptions([{ id: data.supplier_id, name: supplier.name }]);
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
          }
        } catch (error) {
          console.error('加载交易记录失败', error);
          navigate('/transactions');
        }
      };
      loadTransaction();
    }
  }, [id, isEdit, canEdit, navigate]);

  // 校验付款金额
  const validatePaymentAmount = async (purchaseId: string, amount: number, excludeCurrentId?: string): Promise<boolean> => {
    const { data: purchase } = await supabase
      .from('purchases')
      .select('amount')
      .eq('id', purchaseId)
      .single();
    
    if (!purchase) return true;
    
    let query = supabase
      .from('transactions')
      .select('amount')
      .eq('purchase_id', purchaseId)
      .eq('type', 'payment');
    
    if (excludeCurrentId) {
      query = query.neq('id', excludeCurrentId);
    }
    
    const { data: payments } = await query;
    const paidTotal = (payments || []).reduce((sum, p) => sum + Math.abs(parseFloat(p.amount)), 0);
    const remaining = parseFloat(purchase.amount) - paidTotal;
    
    if (amount > remaining) {
      alert(`付款金额超过采购剩余未付款（剩余 ¥${remaining.toFixed(2)}）`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    
    try {
      const currentAmount = Math.abs(parseFloat(formData.amount));
      const currentPurchaseId = formData.purchase_id;
      
      const shouldValidate = !isEdit || 
        (currentAmount !== originalAmount) || 
        (currentPurchaseId !== originalPurchaseId);
      
      if (shouldValidate && formData.type === 'payment' && currentPurchaseId) {
        const isValid = await validatePaymentAmount(currentPurchaseId, currentAmount, isEdit ? id : undefined);
        if (!isValid) {
          setLoading(false);
          return;
        }
      }
      
      let amount = currentAmount;
      if (formData.type === 'payment') {
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
        // 新建时，如果是付款类型，生成编号
        if (formData.type === 'payment') {
          submitData.receipt_no = await generateReceiptNo();
        }
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
              onChange={(val) => {
                setFormData({ ...formData, project_id: val, purchase_id: '' });
                const proj = projects.find(p => p.id === val);
                setSelectedProjectName(proj?.name || '');
              }}
              onSearch={searchProjects}
              placeholder="选择项目"
              displayName={selectedProjectName}
              initialOptions={projectOptions}
            />
            {selectedProjectName && <p className="text-xs text-gray-500 mt-1">已选：{selectedProjectName}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">关联供应商</label>
            <SearchSelect
              value={formData.supplier_id}
              onChange={(val) => {
                setFormData({ ...formData, supplier_id: val, purchase_id: '' });
                const sup = suppliers.find(s => s.id === val);
                setSelectedSupplierName(sup?.name || '');
              }}
              onSearch={searchSuppliers}
              placeholder="选择供应商"
              displayName={selectedSupplierName}
              initialOptions={supplierOptions}
            />
            {selectedSupplierName && <p className="text-xs text-gray-500 mt-1">已选：{selectedSupplierName}</p>}
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">关联采购</label>
            {formData.project_id && formData.supplier_id ? (
              matchingPurchases.length > 0 ? (
                <select
                  value={formData.purchase_id}
                  onChange={(e) => setFormData({ ...formData, purchase_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">不关联采购</option>
                  {matchingPurchases.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
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
            {formData.purchase_id && <p className="text-xs text-green-600 mt-1">✅ 已关联采购单</p>}
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