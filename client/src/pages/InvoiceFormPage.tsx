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
  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);

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
    const amount = parseFloat(formData.amount) || 0;
    const tax = parseFloat(formData.tax_amount) || 0;
    setFormData(prev => ({ ...prev, total_amount: (amount + tax).toFixed(2) }));
  }, [formData.amount, formData.tax_amount]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectId = params.get('projectId');
    const purchaseId = params.get('purchaseId');
    if (projectId) setFormData(prev => ({ ...prev, project_id: projectId }));
    if (purchaseId) loadPurchaseInfo(purchaseId);
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

  // ==================== 根据对方名称筛选项目 ====================
  const loadProjectsBySupplierName = async (supplierName: string) => {
    if (!supplierName) return [];
    
    const { data: matchedSuppliers } = await supabase
      .from('suppliers')
      .select('id, name')
      .ilike('name', `%${supplierName}%`)
      .limit(1);
    
    if (!matchedSuppliers || matchedSuppliers.length === 0) {
      setProjectOptions([]);
      return [];
    }
    
    const supplierId = matchedSuppliers[0].id;
    setSelectedSupplierName(matchedSuppliers[0].name);
    setFormData(prev => ({ ...prev, supplier_id: supplierId }));
    
    const { data: purchases } = await supabase
      .from('purchases')
      .select('project_id, projects(id, name)')
      .eq('supplier_id', supplierId)
      .not('project_id', 'is', null);
    
    if (!purchases || purchases.length === 0) {
      setProjectOptions([]);
      return [];
    }
    
    const uniqueProjects = new Map();
    purchases.forEach(p => {
      if (p.project_id && p.projects && !uniqueProjects.has(p.project_id)) {
        uniqueProjects.set(p.project_id, { id: p.project_id, name: p.projects.name });
      }
    });
    
    const projectList = Array.from(uniqueProjects.values());
    setProjectOptions(projectList);
    return projectList;
  };

  const loadProjectsByClientName = async (clientName: string) => {
    if (!clientName) return [];
    
    const { data: matchedProjects } = await supabase
      .from('projects')
      .select('id, name, client')
      .ilike('client', `%${clientName}%`)
      .limit(50);
    
    if (!matchedProjects || matchedProjects.length === 0) {
      setProjectOptions([]);
      return [];
    }
    
    const projectList = matchedProjects.map(p => ({
      id: p.id,
      name: p.name,
    }));
    setProjectOptions(projectList);
    return projectList;
  };

  useEffect(() => {
    const counterpartyName = formData.supplier_name;
    if (!counterpartyName) {
      setProjectOptions([]);
      setSelectedProjectName('');
      return;
    }
    
    if (formData.type === 'input') {
      loadProjectsBySupplierName(counterpartyName);
    } else {
      loadProjectsByClientName(counterpartyName);
    }
    setFormData(prev => ({ ...prev, project_id: '', purchase_id: '' }));
  }, [formData.supplier_name, formData.type]);

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
                setProjectOptions([{ id: data.project_id, name: project.name }]);
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

  const handleFileChange = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('请上传 PDF 文件');
      return;
    }
    setUploadedFile(file);
    alert('已选择文件，保存时将一起上传');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const uploadFile = async (file: File) => {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('invoices')
      .upload(fileName, file);
    if (error) throw error;
    return data.path;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleFileChange(file);
    }
  };

  const recognizeInvoice = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const response = await fetch('/api/ocr-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdf: base64 })
          });
          const result = await response.json();
          if (result.error_code) {
            reject(new Error(`${result.error_msg} (code: ${result.error_code})`));
          } else {
            resolve(result);
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const formatDateForInput = (dateStr: string): string => {
    if (!dateStr) return '';
    return dateStr.replace(/年|月/g, '-').replace(/日/g, '');
  };

  const handleRecognize = async () => {
    if (!uploadedFile) {
      alert('请先选择要识别的PDF文件');
      return;
    }
    
    setOcrLoading(true);
    try {
      const result = await recognizeInvoice(uploadedFile);
      const words = result.words_result || {};
      
      const myCompanyName = "广东汇信电力建设有限公司";
      
      let detectedType: 'input' | 'output' = formData.type;
      let counterpartyName = '';
      
      if (words.SellerName === myCompanyName) {
        detectedType = 'output';
        counterpartyName = words.PurchaserName || '';
      } else if (words.PurchaserName === myCompanyName) {
        detectedType = 'input';
        counterpartyName = words.SellerName || '';
      } else {
        if (words.SellerName?.includes(myCompanyName)) {
          detectedType = 'output';
          counterpartyName = words.PurchaserName || '';
        } else if (words.PurchaserName?.includes(myCompanyName)) {
          detectedType = 'input';
          counterpartyName = words.SellerName || '';
        } else {
          counterpartyName = words.SellerName || words.PurchaserName || '';
          alert('无法自动判断进项/销项，请手动选择发票类型');
        }
      }
      
      const updates: any = {};
      
      if (words.InvoiceNum) updates.invoice_no = words.InvoiceNum;
      if (words.TotalAmount) updates.amount = words.TotalAmount;
      if (words.TotalTax) updates.tax_amount = words.TotalTax;
      if (words.AmountInFiguers) updates.total_amount = words.AmountInFiguers;
      if (words.InvoiceDate) updates.invoice_date = formatDateForInput(words.InvoiceDate);
      if (counterpartyName) updates.supplier_name = counterpartyName;
      
      if (detectedType === 'output') {
        updates.purchase_id = '';
        updates.supplier_id = '';
      }
      
      setFormData(prev => ({
        ...prev,
        ...updates,
        type: detectedType
      }));
      
      alert(`✅ 识别成功！\n发票类型：${detectedType === 'input' ? '进项' : '销项'}\n已自动填充表单，请核对并补充信息。`);
      
    } catch (error: any) {
      console.error('识别失败:', error);
      alert(`❌ 识别失败：${error.message}`);
    } finally {
      setOcrLoading(false);
    }
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
    if (projectOptions.length > 0) {
      const filtered = projectOptions.filter(p => 
        p.name.toLowerCase().includes(keyword.toLowerCase())
      );
      return filtered;
    }
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

  // ==================== 关联采购筛选：同时按项目和供应商 ====================
  const searchPurchasesByProjectAndSupplier = async (projectId: string, supplierId: string, keyword: string) => {
    if (!projectId || !supplierId) return [];
    let query = supabase
      .from('purchases')
      .select('id, purchase_no, content, amount, supplier_id, suppliers(name)')
      .eq('project_id', projectId)
      .eq('supplier_id', supplierId);
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
    if (!formData.project_id || !formData.supplier_id) return [];
    return searchPurchasesByProjectAndSupplier(formData.project_id, formData.supplier_id, keyword);
  };
  // ==================== 结束 ====================

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
    }
  };

  if (!canEdit) {
    return <div className="text-center py-12 text-red-500">无权限操作</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? '编辑发票' : '新建发票'}</h1>

      <div 
        className={`mb-6 bg-gray-50 rounded-lg p-4 border border-dashed transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <label className="block text-sm font-medium mb-2">📄 上传发票 PDF（可选）</label>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              onChange={handleFileInputChange}
              disabled={uploading || ocrLoading}
              className="flex-1"
            />
            {uploadedFile && <span className="text-green-600 text-sm">已选择: {uploadedFile.name}</span>}
            {currentFilePath && !uploadedFile && (
              <a
                href={supabase.storage.from('invoices').getPublicUrl(currentFilePath).data.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline"
              >
                查看当前附件
              </a>
            )}
          </div>
          
          {uploadedFile && (
            <button
              type="button"
              onClick={handleRecognize}
              disabled={ocrLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 self-start text-sm"
            >
              {ocrLoading ? '🤖 识别中...' : '🔍 识别发票并自动填写'}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          支持 PDF 格式。点击选择文件，或直接拖拽 PDF 文件到此处。选择文件后点击「识别发票」按钮，系统将自动识别并填写发票信息
        </p>
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
                setProjectOptions([]);
                setSelectedProjectName('');
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
            <label className="block text-sm font-medium mb-1">所属项目</label>
            <SearchSelect
              value={formData.project_id}
              onChange={handleProjectChange}
              onSearch={searchProjects}
              placeholder="选择项目"
              displayName={selectedProjectName}
              initialOptions={projectOptions}
            />
            {selectedProjectName && <p className="text-xs text-gray-500 mt-1">已选：{selectedProjectName}</p>}
            {formData.supplier_name && projectOptions.length === 0 && (
              <p className="text-xs text-orange-500 mt-1">未找到匹配的项目，请手动选择</p>
            )}
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
                  });
                }}
                onSearch={handlePurchaseSearch}
                placeholder="选择采购单"
                initialOptions={purchaseOptions}
                disabled={!formData.project_id || !formData.supplier_id}
              />
              {formData.project_id && !formData.purchase_id && (
                <p className="text-xs text-gray-500 mt-1">选择采购单可自动填充供应商</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">对方名称 *</label>
            <input
              type="text"
              required
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              placeholder={formData.type === 'output' ? '甲方名称' : '发票上的对方名称'}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {formData.type === 'input' && (
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