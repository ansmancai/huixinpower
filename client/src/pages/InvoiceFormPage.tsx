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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState('');

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
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<any[]>([]);
  const [purchaseOptions, setPurchaseOptions] = useState<any[]>([]);

  const isEdit = !!id;
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  // 自动计算总金额
  useEffect(() => {
    const a = parseFloat(formData.amount) || 0;
    const t = parseFloat(formData.tax_amount) || 0;
    setFormData(prev => ({ ...prev, total_amount: (a + t).toFixed(2) }));
  }, [formData.amount, formData.tax_amount]);

  // 上传PDF到后端解析
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setUploading(true);

    try {
      // 1. 构造FormData传给后端
      const formData = new FormData();
      formData.append('file', file);

      // 2. 调用后端Edge Functions接口
      const res = await fetch('/api/parse-invoice', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('后端解析失败');
      const result = await res.json();
      console.log('✅ 后端返回结果：', result);

      // 3. 自动填充表单
      setFormData(prev => ({
        ...prev,
        invoice_no: result.invoice_no || prev.invoice_no,
        invoice_date: result.date || prev.invoice_date,
        amount: result.amount || prev.amount,
        tax_amount: result.tax || prev.tax_amount,
        supplier_name: result.seller || prev.supplier_name,
      }));

      alert(`✅ 解析成功！\n发票号：${result.invoice_no}\n金额：${result.amount}\n销售方：${result.seller}`);
    } catch (err) {
      console.error('❌ 错误：', err);
      alert('解析失败，请检查控制台');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 原有逻辑完整保留
  const uploadFile = async (file: File) => {
    const name = `${Date.now()}.${file.name.split('.').pop()}`;
    const { data } = await supabase.storage.from('invoices').upload(name, file);
    return data?.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let fp = currentFilePath;
      if (uploadedFile) {
        if (currentFilePath) await supabase.storage.from('invoices').remove([currentFilePath]);
        fp = await uploadFile(uploadedFile);
      }

      const body = {
        type: formData.type,
        invoice_no: formData.invoice_no,
        amount: parseFloat(formData.amount) || 0,
        tax_amount: parseFloat(formData.tax_amount) || 0,
        total_amount: parseFloat(formData.total_amount) || 0,
        invoice_date: formData.invoice_date,
        project_id: formData.project_id || null,
        purchase_id: formData.purchase_id || null,
        supplier_name: formData.supplier_name,
        supplier_id: formData.supplier_id || null,
        status: formData.status,
        remark: formData.remark,
        file_path: fp,
      };

      if (isEdit) {
        await supabase.from('invoices').update(body).eq('id', id);
      } else {
        await supabase.from('invoices').insert([{ ...body, id: crypto.randomUUID() }]);
      }
      navigate('/invoices');
    } catch (err) {
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索逻辑完整保留
  const searchProjects = async (keyword: string) => {
    const { data } = await supabase.from('projects').select('id,name,client').ilike('name', `%${keyword}%`).limit(20);
    return data || [];
  };
  const searchSuppliers = async (keyword: string) => {
    const { data } = await supabase.from('suppliers').select('id,name').ilike('name', `%${keyword}%`).limit(20);
    return data || [];
  };
  const searchPurchasesByProject = async (projectId: string, keyword: string) => {
    let q = supabase.from('purchases').select('id,purchase_no,content,amount,supplier_id,suppliers(name)').eq('project_id', projectId);
    if (keyword) q = q.ilike('purchase_no', `%${keyword}%`);
    const { data } = await q.limit(20);
    return data?.map(p => ({ id: p.id, name: `${p.purchase_no} ${p.content}`, supplier_name: p.suppliers?.name, supplier_id: p.supplier_id, amount: p.amount })) || [];
  };

  const handleProjectChange = (val: string) => {
    setFormData(prev => ({ ...prev, project_id: val, purchase_id: '', supplier_id: '' }));
  };
  const handlePurchaseSearch = async (k: string) => {
    if (!formData.project_id) return [];
    return searchPurchasesByProject(formData.project_id, k);
  };

  if (!canEdit) return <div className="p-10 text-red-500 text-center">无权限</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">{isEdit ? '编辑发票' : '新建发票'}</h1>

      <div className="mb-6 p-4 border rounded bg-gray-50">
        <label className="block mb-2">📄 上传 PDF（自动识别）</label>
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="w-full"
        />
        {uploadedFile && <span className="text-green-600 text-sm ml-2">已选：{uploadedFile.name}</span>}
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">发票号码 *</label>
            <input className="w-full border p-2 rounded" value={formData.invoice_no} onChange={e => setFormData({ ...formData, invoice_no: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">开票日期 *</label>
            <input className="w-full border p-2 rounded" type="date" value={formData.invoice_date} onChange={e => setFormData({ ...formData, invoice_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">金额 *</label>
            <input className="w-full border p-2 rounded" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">税额</label>
            <input className="w-full border p-2 rounded" value={formData.tax_amount} onChange={e => setFormData({ ...formData, tax_amount: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">对方名称 *</label>
            <input className="w-full border p-2 rounded" value={formData.supplier_name} onChange={e => setFormData({ ...formData, supplier_name: e.target.value })} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  );
}