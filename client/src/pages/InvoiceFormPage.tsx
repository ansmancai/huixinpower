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
    supplier_id: '',
    project_id: '',
    purchase_id: '',
    status: 'unpaid',
    remark: '',
  });

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
    const supplierId = params.get('supplierId');
    const purchaseId = params.get('purchaseId');
    if (projectId) setFormData(prev => ({ ...prev, project_id: projectId }));
    if (supplierId) setFormData(prev => ({ ...prev, supplier_id: supplierId }));
    if (purchaseId) setFormData(prev => ({ ...prev, purchase_id: purchaseId }));
  }, [location]);

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
              supplier_id: data.supplier_id || '',
              project_id: data.project_id || '',
              purchase_id: data.purchase_id || '',
              status: data.status || 'unpaid',
              remark: data.remark || '',
            });
          }
        } catch (error) {
          console.error('加载发票失败', error);
          navigate('/invoices');
        }
      };
      loadInvoice();
    }
  }, [id, isEdit, canEdit, navigate]);

  // 调用 EdgeOne Functions 解析 PDF
  const parsePDF = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/parse-invoice', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  };

  // 上传并解析 PDF
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
      
      // 填充表单
      if (info.invoice_no) setFormData(prev => ({ ...prev, invoice_no: info.invoice_no }));
      if (info.date) setFormData(prev => ({ ...prev, invoice_date: info.date }));
      if (info.amount) setFormData(prev => ({ ...prev, amount: info.amount }));
      if (info.tax) setFormData(prev => ({ ...prev, tax_amount: info.tax }));
      if (info.total) setFormData(prev => ({ ...prev, total_amount: info.total }));
      
      // 根据购买方/销售方判断发票类型
      const sellerName = info.seller || '';
      const buyerName = info.buyer || '';
      if (buyerName.includes('汇信电力')) {
        setFormData(prev => ({ ...prev, type: 'input' }));
      } else if (sellerName.includes('汇信电力')) {
        setFormData(prev => ({ ...prev, type: 'output' }));
      }
      
      // 根据销售方名称搜索供应商
      const targetName = sellerName || buyerName;
      if (targetName) {
        const { data } = await supabase
          .from('suppliers')
          .select('id, name')
          .ilike('name', `%${targetName}%`)
          .limit(1);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, supplier_id: data[0].id }));
          alert(`已自动匹配供应商: ${data[0].name}`);
        }
      }
      
      alert('PDF 解析成功，已自动填充表单');
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
        supplier_id: formData.supplier_id || null,
        project_id: formData.project_id || null,
        purchase_id: formData.purchase_id || null,
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

  const searchPurchases = async (keyword: string) => {
    const { data } = await supabase
      .from('purchases')
      .select('id, purchase_no, content')
      .ilike('purchase_no', `%${keyword}%`)
      .limit(20);
    return data || [];
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
            支持电子发票 PDF，上传后自动提取发票号码、金额、开票日期、对方名称等信息
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
          <div>
            <label className="block text-sm font-medium mb-1">对方名称</label>
            <SearchSelect
              value={formData.supplier_id}
              onChange={(val) => setFormData({ ...formData, supplier_id: val })}
              onSearch={searchSuppliers}
              placeholder="选择供应商"
            />
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">关联采购</label>
            <SearchSelect
              value={formData.purchase_id}
              onChange={(val) => setFormData({ ...formData, purchase_id: val })}
              onSearch={searchPurchases}
              placeholder="选择采购单（按采购单号搜索）"
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