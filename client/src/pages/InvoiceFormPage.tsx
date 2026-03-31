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
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<any[]>([]);
  const [purchaseOptions, setPurchaseOptions] = useState<any[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState('');

  const isEdit = !!id;
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const amount = parseFloat(formData.amount) || 0;
    const tax = parseFloat(formData.tax_amount) || 0;
    const total = amount + tax;
    setFormData(prev => ({ ...prev, total_amount: total.toString() }));
  }, [formData.amount, formData.tax_amount]);

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
           
            if (data.file_path) setCurrentFilePath(data.file_path);

            if (data.project_id) {
              const { data: project } = await supabase
                .from('projects')
                .select('name, client')
                .eq('id', data.project_id)
                .single();
              if (project) {
                setProjectOptions([{ id: project.id, name: project.name }]);
                setSelectedProjectName(project.name);
                if (data.type === 'output' && project.client) {
                  setFormData(prev => ({ ...prev, supplier_name: project.client }));
                }
              }
            }
            
            if (data.supplier_id) {
              const { data: supplier } = await supabase
                .from('suppliers')
                .select('name')
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
                .select('id, purchase_no, content, amount, supplier_id, suppliers(name)')
                .eq('id', data.purchase_id)
                .single();
              if (purchase) {
                setPurchaseOptions([{
                  id: purchase.id,
                  name: `${purchase.purchase_no} - ${purchase.content} (¥${purchase.amount})`,
                  supplier_name: purchase.suppliers?.name || '',
                  supplier_id: purchase.supplier_id || '',
                  amount: purchase.amount,
                }]);
              }
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

  // ==============================
  // 零依赖 PDF 解析（已修好）
  // ==============================
  const parsePDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const pdfStr = new TextDecoder('utf-8').decode(bytes);

    let text = '';
    const regex = /\/Text\s*?(.+?)\/(?:Font|XObject)/gs;
    let match;

    while ((match = regex.exec(pdfStr)) !== null) {
      let chunk = match[1];
      chunk = chunk.replace(/\\\(|\\\)/g, '').replace(/[\(\)]/g, '');
      chunk = chunk.replace(/\\([0-9]{1,3})/g, (_, oct) =>
        String.fromCharCode(parseInt(oct, 8))
      );
      text += chunk + ' ';
    }

    return {
      invoice_no: extractInvoiceNo(text),
      amount: extractAmount(text),
      tax: extractTax(text),
      date: extractDate(text),
      seller: extractSeller(text),
      buyer: extractBuyer(text),
    };
  };

  function extractInvoiceNo(text: string) {
    const match = text.match(/发票号码[：:]\s*(\d+)/);
    return match ? match[1] : '';
  }

  function extractAmount(text: string) {
    const match = text.match(/金额[（(]小写[）)]|[：:]\s*([\d,]+\.?\d*)/);
    if (match && match[1]) return match[1].replace(/,/g, '');
    const match2 = text.match(/(\d+\.?\d{2})(?=\s*元)/);
    return match2 ? match2[1] : '';
  }

  function extractTax(text: string) {
    const match = text.match(/税额[：:]\s*([\d,]+\.?\d*)/);
    return match ? match[1].replace(/,/g, '') : '';
  }

  function extractDate(text: string) {
    const match = text.match(/开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)/);
    if (match) {
      return match[1].replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '');
    }
    const match2 = text.match(/(\d{4}-\d{2}-\d{2})/);
    return match2 ? match2[1] : '';
  }

  function extractSeller(text: string) {
    const match = text.match(/销售方[：:][\s\S]*?名称[：:]\s*([^\n\r]+)/);
    return match ? match[1].trim() : '';
  }

  function extractBuyer(text: string) {
    const match = text.match(/购买方[：:][\s\S]*?名称[：:]\s*([^\n\r]+)/);
    return match ? match[1].trim() : '';
  }

  const uploadFile = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}.${ext}`;
    const { data, error } = await supabase.storage.from('invoices').upload(fileName, file);
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    
    try {
      let filePath = currentFilePath;
      if (uploadedFile) {
        if (currentFilePath) {
          await supabase.storage.from('invoices').remove([currentFilePath]);
        }
        filePath = await uploadFile(uploadedFile);
      }
      
      const submitData: any = {
        type: formData.type,
        invoice_no: formData.invoice_no,
        amount: parseFloat(formData.amount) || 0,
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : null,
        total_amount: parseFloat(formData.total_amount) || 0,
        invoice_date: formData.invoice_date,
        project_id: formData.project_id || null,
        purchase_id: formData.type === 'input' ? (formData.purchase_id || null) : null,
        supplier_name: formData.supplier_name || null,
        supplier_id: formData.type === 'input' ? (formData.supplier_id || null) : null,
        status: formData.status,
        remark: formData.remark || null,
        file_path: filePath,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error } = await supabase.from('invoices').update(submitData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('invoices').insert([{
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
      .select('id, name, code, client')
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

  const searchPurchasesByProject = async (projectId: string, keyword: string) => {
    if (!projectId) return [];
    let query = supabase
      .from('purchases')
      .select('id, purchase_no, content, amount, supplier_id, suppliers(name)')
      .eq('project_id', projectId);
    
    if (keyword) query = query.ilike('purchase_no', `%${keyword}%`);
    const { data } = await query.limit(20);
    return data?.map(p => ({
      id: p.id,
      name: `${p.purchase_no} - ${p.content} (¥${p.amount})`,
      supplier_name: p.suppliers?.name || '',
      supplier_id: p.supplier_id || '',
      amount: p.amount,
    })) || [];
  };

  const handlePurchaseSearch = async (keyword: string) => {
    if (!formData.project_id) return [];
    return searchPurchasesByProject(formData.project_id, keyword);
  };

  const handleProjectChange = async (projectId: string) => {
    setFormData(prev => ({ ...prev, project_id: projectId, purchase_id: '', supplier_id: '' }));
    setSelectedProjectName('');
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('name, client')
        .eq('id', projectId)
        .single();
      if (project) {
        setSelectedProjectName(project.name);
        setProjectOptions([{ id: project.id, name: project.name }]);
        if (formData.type === 'output' && project.client) {
          setFormData(prev => ({ ...prev, supplier_name: project.client }));
        }
      }
    } else {
      setProjectOptions([]);
    }
  };

  if (!canEdit) {
    return <div className="text-center py-12 text-red-500">无权限操作</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? '编辑发票' : '新建发票'}</h1>
      
      <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
        <label className="block text-sm font-medium mb-2">📄 上传发票 PDF（自动识别）</label>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploadedFile(file);
              setUploading(true);
              try {
                const info = await parsePDF(file);
                if (info.invoice_no) setFormData(prev => ({ ...prev, invoice_no: info.invoice_no }));
                if (info.date) setFormData(prev => ({ ...prev, invoice_date: info.date }));
                if (info.amount) setFormData(prev => ({ ...prev, amount: info.amount }));
                if (info.tax) setFormData(prev => ({ ...prev, tax_amount: info.tax }));
                if (info.seller) setFormData(prev => ({ ...prev, supplier_name: info.seller }));
                alert('✅ PDF 解析完成，已自动填充！');
              } catch (err) {
                console.error(err);
                alert('❌ 解析失败');
              } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
            className="flex-1"
            disabled={uploading}
          />
          {uploadedFile && <span className="text-green-600 text-sm">已选：{uploadedFile.name}</span>}
          {currentFilePath && !uploadedFile && (
            <a 
              href={supabase.storage.from('invoices').getPublicUrl(currentFilePath).data.publicUrl}
              target="_blank" rel="noopener noreferrer"
              className="text-blue-600 text-sm hover:underline"
            >
              查看附件
            </a>
          )}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">发票类型 *</label>
            <select
              required
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value;
                setFormData({
                  ...formData,
                  type: newType,
                  purchase_id: '',
                  supplier_id: '',
                  supplier_name: newType === 'input' ? '' : formData.supplier_name,
                });
              }}
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
            <label className="block text-sm font-medium mb-1">所属项目 {formData.type === 'output' && '*'}</label>
            <SearchSelect
              value={formData.project_id}
              onChange={handleProjectChange}
              onSearch={searchProjects}
              placeholder="选择项目"
              displayName={selectedProjectName}
              initialOptions={projectOptions}
            />
          </div>
          
          {formData.type === 'input' && (
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
                initialOptions={purchaseOptions}
                disabled={!formData.project_id}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">对方名称 *</label>
            <input
              type="text"
              required
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          {formData.type === 'input' && (
            <div>
              <label className="block text-sm font-medium mb-1">关联供应商（可选）</label>
              <SearchSelect
                value={formData.supplier_id}
                onChange={(val, option: any) => {
                  if (option) setFormData({ ...formData, supplier_id: val, supplier_name: option.name });
                }}
                onSearch={searchSuppliers}
                placeholder="选择供应商"
                displayName={selectedSupplierName}
                initialOptions={supplierOptions}
              />
            </div>
          )}
          
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