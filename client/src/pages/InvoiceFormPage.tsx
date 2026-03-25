import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import SearchSelect from '../components/SearchSelect';

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    type: 'input',
    invoice_no: '',
    amount: '',
    tax_amount: '',
    total_amount: '',
    invoice_date: '',
    project_id: '',
    purchase_id: '',
    supplier_name: '',
    supplier_id: '',
    status: 'unpaid',
    remark: '',
  });
const [selectedProjectName, setSelectedProjectName] = useState('');
const [selectedSupplierName, setSelectedSupplierName] = useState('');

  const isEdit = !!id;
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  // 自动计算总金额
  useEffect(() => {
    const amount = parseFloat(formData.amount) || 0;
    const tax = parseFloat(formData.tax_amount) || 0;
    const total = amount + tax;
    setFormData(prev => ({ ...prev, total_amount: total.toString() }));
  }, [formData.amount, formData.tax_amount]);

  // 从 URL 参数获取带入的数据
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectId = params.get('projectId');
    const purchaseId = params.get('purchaseId');
    if (projectId) setFormData(prev => ({ ...prev, project_id: projectId }));
    if (purchaseId) {
      loadPurchaseInfo(purchaseId);
    }
  }, [location]);

  const loadPurchaseInfo = async (purchaseId: string) => {
    const { data } = await supabase
      .from('purchases')
      .select('*, suppliers(name), suppliers(id)')
      .eq('id', purchaseId)
      .single();
    if (data) {
      setFormData(prev => ({
        ...prev,
        purchase_id: data.id,
        supplier_name: data.suppliers?.name || '',
        supplier_id: data.supplier_id || '',
        amount: data.amount || '',
      }));
    }
  };

  useEffect(() => {
  if (isEdit && canEdit) {
    const loadInvoice = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (data) {
          setFormData({
            type: data.type || 'input',
            invoice_no: data.invoice_no || '',
            amount: data.amount || '',
            tax_amount: data.tax_amount || '',
            total_amount: data.total_amount || '',
            invoice_date: data.invoice_date || '',
            project_id: data.project_id || '',
            purchase_id: data.purchase_id || '',
            supplier_name: data.supplier_name || '',
            supplier_id: data.supplier_id || '',
            status: data.status || 'unpaid',
            remark: data.remark || '',
          });
          
          if (data.project_id) {
            const { data: project } = await supabase
              .from('projects')
              .select('name')
              .eq('id', data.project_id)
              .single();
            if (project) setSelectedProjectName(project.name);
          }
          
          if (data.supplier_id) {
            const { data: supplier } = await supabase
              .from('suppliers')
              .select('name')
              .eq('id', data.supplier_id)
              .single();
            if (supplier) setSelectedSupplierName(supplier.name);
          }
        }
      } catch (error) {
        console.error('加载发票失败', error);
        navigate('/invoices');
      }
    };
    loadInvoice();
  }
}, [id, isEdit, canEdit, navigate]);

  // PDF 解析（暂保留）
  const parsePDF = async (file: File) => {
    return {};
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('请上传 PDF 文件');
      return;
    }
    
    setUploading(true);
    try {
      const info = await parsePDF(file);
      if (info.invoice_no) setFormData(prev => ({ ...prev, invoice_no: info.invoice_no }));
      if (info.date) setFormData(prev => ({ ...prev, invoice_date: info.date }));
      if (info.amount) setFormData(prev => ({ ...prev, amount: info.amount }));
      if (info.tax) setFormData(prev => ({ ...prev, tax_amount: info.tax }));
      if (info.seller) setFormData(prev => ({ ...prev, supplier_name: info.seller }));
      alert('PDF 解析完成，已自动填充表单');
    } catch (error) {
      console.error('解析 PDF 失败:', error);
      alert('解析 PDF 失败，请手动填写');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    
    try {
      const submitData: any = {
        type: formData.type,
        invoice_no: formData.invoice_no,
        amount: parseFloat(formData.amount) || 0,
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : null,
        total_amount: parseFloat(formData.total_amount) || 0,
        invoice_date: formData.invoice_date,
        project_id: formData.project_id || null,
        purchase_id: formData.purchase_id || null,
        supplier_name: formData.supplier_name || null,
        supplier_id: formData.supplier_id || null,
        status: formData.status,
        remark: formData.remark || null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error } = await supabase
          .from('invoices')
          .update(submitData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('invoices')
          .insert([{
            ...submitData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          }]);
        if (error) throw error;
      }
      
      navigate('/invoices');
    } catch (error: any) {
      console.error('保存失败:', error);
      alert(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索项目
  const searchProjects = async (keyword: string) => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, code')
      .ilike('name', `%${keyword}%`)
      .limit(20);
    return data || [];
  };

  // 搜索供应商（用于关联）
  const searchSuppliers = async (keyword: string) => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, code')
      .ilike('name', `%${keyword}%`)
      .limit(20);
    return data || [];
  };

  // 根据项目搜索采购单（返回带供应商信息）
  const searchPurchasesByProject = async (projectId: string, keyword: string) => {
    if (!projectId) return [];
    let query = supabase
      .from('purchases')
      .select('id, purchase_no, content, amount, supplier_id, suppliers(name)')
      .eq('project_id', projectId);
    
    if (keyword) {
      query = query.ilike('purchase_no', `%${keyword}%`);
    }
    
    const { data } = await query.limit(20);
    return data?.map(p => ({
      id: p.id,
      name: `${p.purchase_no} - ${p.content} (¥${p.amount})`,
      supplier_name: p.suppliers?.name || '',
      supplier_id: p.supplier_id || '',
      amount: p.amount,
    })) || [];
  };

  // 包装 SearchSelect 的 onSearch 函数
  const handlePurchaseSearch = async (keyword: string) => {
    if (!formData.project_id) {
      return [];
    }
    return searchPurchasesByProject(formData.project_id, keyword);
  };

  if (!canEdit) {
    return <div className="text-center py-12 text-red-500">无权限操作</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? '编辑发票' : '新建发票'}</h1>
      
      {/* PDF 上传区域 */}
      {!isEdit && (
        <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
          <label className="block text-sm font-medium mb-2">📄 上传 PDF 发票（可选，自动识别填写）</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1"
            />
            {uploading && <span className="text-blue-600">解析中...</span>}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            支持电子发票 PDF，上传后自动提取信息（功能完善中）
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">发票类型 *</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="input">进项（收到发票）</option>
              <option value="output">销项（开出发票）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">发票号码 *</label>
            <input
              type="text"
              required
              value={formData.invoice_no}
              onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
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
            <label className="block text-sm font-medium mb-1">税额</label>
            <input
              type="number"
              step="0.01"
              value={formData.tax_amount}
              onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">总金额 *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.total_amount}
              className="w-full px-3 py-2 border rounded-lg bg-gray-50"
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">自动计算（金额 + 税额）</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">开票日期 *</label>
            <input
              type="date"
              required
              value={formData.invoice_date}
              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          {/* 所属项目 */}
          <div>
            <label className="block text-sm font-medium mb-1">所属项目</label>
            <SearchSelect
              value={formData.project_id}
              onChange={(val) => {
                setFormData({ ...formData, project_id: val, purchase_id: '', supplier_name: '', supplier_id: '' });
              }}
              onSearch={searchProjects}
              placeholder="选择项目"
              displayName={selectedProjectName}  
            />
          </div>
          
          {/* 关联采购（根据项目自动筛选） */}
          <div>
            <label className="block text-sm font-medium mb-1">关联采购（可选）</label>
            <SearchSelect
              value={formData.purchase_id}
              onChange={(val, option: any) => {
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
              disabled={!formData.project_id}
            />
            {formData.project_id && !formData.purchase_id && (
              <p className="text-xs text-gray-500 mt-1">选择采购单可自动填充供应商和金额</p>
            )}
            {!formData.project_id && (
              <p className="text-xs text-gray-500 mt-1">请先选择项目</p>
            )}
          </div>
          
          {/* 对方名称（自由输入） */}
          <div>
            <label className="block text-sm font-medium mb-1">对方名称 *</label>
            <input
              type="text"
              required
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              placeholder="发票上的对方名称"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          {/* 关联供应商（可选） */}
          <div>
            <label className="block text-sm font-medium mb-1">关联供应商（可选）</label>
            <SearchSelect
              value={formData.supplier_id}
              onChange={(val, option: any) => {
                if (option) {
                  setFormData({ ...formData, supplier_id: val, supplier_name: option.name });
                }
              }}
              onSearch={searchSuppliers}
              placeholder="如对方是系统供应商，可选择关联"
              displayName={selectedSupplierName} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">状态</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="unpaid">未付款</option>
              <option value="partial">部分付款</option> 
              <option value="paid">已付款</option>
              <option value="cancelled">作废</option>
            </select>
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
          <button type="button" onClick={() => navigate('/invoices')} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}