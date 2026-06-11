import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import SearchSelect from '../components/SearchSelect';

export default function InvoiceFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // 基础状态
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);

  // 表单数据
  const [form, setForm] = useState({
    type: 'input',                 // input / output
    invoice_no: '',
    amount: '',
    tax_amount: '',
    total_amount: '',
    invoice_date: '',
    project_id: '',
    purchase_id: '',
    supplier_name: '',             // 对方名称（进项=供应商，销项=甲方）
    supplier_id: '',
    status: 'unpaid',
    remark: '',
  });

  // 下拉选项池
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<any[]>([]);
  const [purchaseOptions, setPurchaseOptions] = useState<any[]>([]);
  // 选中项的显示名称
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [selectedPurchaseName, setSelectedPurchaseName] = useState('');

  const isEdit = !!id;
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  // ==================== 辅助函数 ====================
  const isInput = form.type === 'input';

  // 自动计算总金额
  useEffect(() => {
    const amount = parseFloat(form.amount) || 0;
    const tax = parseFloat(form.tax_amount) || 0;
    setForm(prev => ({ ...prev, total_amount: (amount + tax).toFixed(2) }));
  }, [form.amount, form.tax_amount]);

  // 重置所有依赖项（对方名称变化时调用）
  const resetDependentOptions = useCallback(() => {
    setProjectOptions([]);
    setSelectedProjectName('');
    setPurchaseOptions([]);
    setSelectedPurchaseName('');
    setForm(prev => ({ ...prev, project_id: '', purchase_id: '' }));
  }, []);

  // ==================== 根据对方名称加载项目列表 ====================
  const loadProjects = useCallback(async (name: string) => {
    if (!name) {
      resetDependentOptions();
      return;
    }

    if (isInput) {
      // 进项：根据供应商名称匹配供应商，再通过采购记录查项目
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .ilike('name', `%${name}%`)
        .limit(1);
      if (!suppliers?.length) {
        resetDependentOptions();
        return;
      }
      const supplierId = suppliers[0].id;
      setSelectedSupplierName(suppliers[0].name);
      setForm(prev => ({ ...prev, supplier_id: supplierId }));

      const { data: purchases } = await supabase
        .from('purchases')
        .select('project_id, projects(id, name)')
        .eq('supplier_id', supplierId)
        .not('project_id', 'is', null);
      if (!purchases?.length) {
        setProjectOptions([]);
        return;
      }
      const unique = new Map();
      purchases.forEach(p => {
        if (p.project_id && p.projects && !unique.has(p.project_id))
          unique.set(p.project_id, { id: p.project_id, name: p.projects.name });
      });
      const projects = Array.from(unique.values());
      setProjectOptions(projects);
      // 自动选中唯一项目
      if (projects.length === 1) {
        setSelectedProjectName(projects[0].name);
        setForm(prev => ({ ...prev, project_id: projects[0].id }));
      }
    } else {
      // 销项：直接匹配项目的 client 字段
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, client')
        .ilike('client', `%${name}%`)
        .limit(50);
      if (!projects?.length) {
        setProjectOptions([]);
        return;
      }
      const opts = projects.map(p => ({ id: p.id, name: p.name }));
      setProjectOptions(opts);
      if (opts.length === 1) {
        setSelectedProjectName(opts[0].name);
        setForm(prev => ({ ...prev, project_id: opts[0].id }));
      }
    }
  }, [isInput, resetDependentOptions]);

  // 对方名称变化时触发
  useEffect(() => {
    loadProjects(form.supplier_name);
  }, [form.supplier_name, loadProjects]);

  // ==================== 根据项目和供应商加载采购单列表 ====================
  const loadPurchases = useCallback(async () => {
    if (!isInput || !form.project_id || !form.supplier_id) {
      setPurchaseOptions([]);
      return;
    }
    const { data } = await supabase
      .from('purchases')
      .select('id, purchase_no, content, amount, supplier_id, suppliers(name)')
      .eq('project_id', form.project_id)
      .eq('supplier_id', form.supplier_id)
      .order('purchase_date', { ascending: false });
    const opts = data?.map(p => ({
      id: p.id,
      name: `${p.purchase_no} - ${p.content} (¥${p.amount})`,
      supplier_name: p.suppliers?.name || '',
      supplier_id: p.supplier_id,
      amount: p.amount,
    })) || [];
    setPurchaseOptions(opts);
    // 如果当前已选采购单不在列表中，清空
    if (form.purchase_id && !opts.some(opt => opt.id === form.purchase_id)) {
      setForm(prev => ({ ...prev, purchase_id: '' }));
      setSelectedPurchaseName('');
    }
  }, [isInput, form.project_id, form.supplier_id, form.purchase_id]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  // ==================== 编辑时加载发票数据 ====================
  useEffect(() => {
    if (!isEdit || !canEdit) return;
    const loadInvoice = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (!data) return;

        setForm({
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

        // 回显项目名称
        if (data.project_id) {
          const { data: proj } = await supabase
            .from('projects')
            .select('name, client')
            .eq('id', data.project_id)
            .single();
          if (proj) {
            setSelectedProjectName(proj.name);
            if (data.type === 'output' && proj.client)
              setForm(prev => ({ ...prev, supplier_name: proj.client }));
          }
        }
        // 回显供应商名称
        if (data.supplier_id) {
          const { data: sup } = await supabase
            .from('suppliers')
            .select('name')
            .eq('id', data.supplier_id)
            .single();
          if (sup) {
            setSelectedSupplierName(sup.name);
            setSupplierOptions([{ id: data.supplier_id, name: sup.name }]);
          }
        }
        // 回显采购单名称（进项且有关联）
        if (data.type === 'input' && data.purchase_id) {
          const { data: pur } = await supabase
            .from('purchases')
            .select('id, purchase_no, content, amount')
            .eq('id', data.purchase_id)
            .single();
          if (pur) {
            const name = `${pur.purchase_no} - ${pur.content} (¥${pur.amount})`;
            setSelectedPurchaseName(name);
            setPurchaseOptions([{ id: pur.id, name, supplier_name: '', supplier_id: '', amount: pur.amount }]);
          }
        }
      } catch (err) {
        console.error('加载发票失败', err);
        navigate('/invoices');
      } finally {
        setLoading(false);
      }
    };
    loadInvoice();
  }, [id, isEdit, canEdit, navigate]);

  // ==================== 保存提交 ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    try {
      let filePath = currentFilePath;
      if (uploadedFile) {
        if (currentFilePath) await supabase.storage.from('invoices').remove([currentFilePath]);
        const ext = uploadedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage.from('invoices').upload(fileName, uploadedFile);
        if (error) throw error;
        filePath = data.path;
      }

      const submitData: any = {
        type: form.type,
        invoice_no: form.invoice_no,
        amount: parseFloat(form.amount) || 0,
        tax_amount: form.tax_amount ? parseFloat(form.tax_amount) : null,
        total_amount: parseFloat(form.total_amount) || 0,
        invoice_date: form.invoice_date,
        project_id: form.project_id || null,
        purchase_id: isInput ? (form.purchase_id || null) : null,
        supplier_name: form.supplier_name || null,
        supplier_id: isInput ? (form.supplier_id || null) : null,
        status: form.status,
        remark: form.remark || null,
        file_path: filePath,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        await supabase.from('invoices').update(submitData).eq('id', id);
      } else {
        await supabase.from('invoices').insert([{
          ...submitData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        }]);
      }
      navigate('/invoices');
    } catch (err: any) {
      console.error('保存失败:', err);
      alert(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // ==================== OCR 识别 ====================
  const recognizeInvoice = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const res = await fetch('/api/ocr-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdf: base64 }),
          });
          const result = await res.json();
          if (result.error_code) reject(new Error(`${result.error_msg} (${result.error_code})`));
          else resolve(result);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const formatDateForInput = (dateStr: string) => dateStr.replace(/年|月/g, '-').replace(/日/g, '');

  const handleRecognize = async () => {
    if (!uploadedFile) {
      alert('请先选择要识别的PDF文件');
      return;
    }
    setOcrLoading(true);
    try {
      const result: any = await recognizeInvoice(uploadedFile);
      const words = result.words_result || {};
      const myCompany = '广东汇信电力建设有限公司';
      let detectedType: 'input' | 'output' = form.type;
      let counterparty = '';

      if (words.SellerName === myCompany) {
        detectedType = 'output';
        counterparty = words.PurchaserName || '';
      } else if (words.PurchaserName === myCompany) {
        detectedType = 'input';
        counterparty = words.SellerName || '';
      } else {
        if (words.SellerName?.includes(myCompany)) {
          detectedType = 'output';
          counterparty = words.PurchaserName || '';
        } else if (words.PurchaserName?.includes(myCompany)) {
          detectedType = 'input';
          counterparty = words.SellerName || '';
        } else {
          counterparty = words.SellerName || words.PurchaserName || '';
          alert('无法自动判断进项/销项，请手动选择发票类型');
        }
      }

      const updates: any = {};
      if (words.InvoiceNum) updates.invoice_no = words.InvoiceNum;
      if (words.TotalAmount) updates.amount = words.TotalAmount;
      if (words.TotalTax) updates.tax_amount = words.TotalTax;
      if (words.AmountInFiguers) updates.total_amount = words.AmountInFiguers;
      if (words.InvoiceDate) updates.invoice_date = formatDateForInput(words.InvoiceDate);
      if (counterparty) updates.supplier_name = counterparty;
      if (detectedType === 'output') {
        updates.purchase_id = '';
        updates.supplier_id = '';
      }
      setForm(prev => ({ ...prev, ...updates, type: detectedType }));
      alert(`✅ 识别成功！\n发票类型：${detectedType === 'input' ? '进项' : '销项'}\n已自动填充表单，请核对并补充信息。`);
    } catch (err: any) {
      console.error(err);
      alert(`❌ 识别失败：${err.message}`);
    } finally {
      setOcrLoading(false);
    }
  };

  // ==================== 文件上传相关 ====================
  const handleFileChange = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('请上传 PDF 文件');
      return;
    }
    setUploadedFile(file);
    alert('已选择文件，保存时将一起上传');
  };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
  };
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
  };

  // ==================== 搜索函数 ====================
  const searchProjects = async (kw: string) => {
    if (projectOptions.length) {
      return projectOptions.filter(p => p.name.toLowerCase().includes(kw.toLowerCase()));
    }
    const { data } = await supabase
      .from('projects')
      .select('id, name, code, client')
      .ilike('name', `%${kw}%`)
      .limit(20);
    return data || [];
  };
  const searchSuppliers = async (kw: string) => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, code')
      .ilike('name', `%${kw}%`)
      .limit(20);
    return data || [];
  };
  const handlePurchaseSearch = async (kw: string) => {
    if (!isInput || !form.project_id || !form.supplier_id) return [];
    let q = supabase
      .from('purchases')
      .select('id, purchase_no, content, amount, supplier_id, suppliers(name)')
      .eq('project_id', form.project_id)
      .eq('supplier_id', form.supplier_id);
    if (kw) q = q.ilike('purchase_no', `%${kw}%`);
    const { data } = await q.limit(20);
    return data?.map(p => ({
      id: p.id,
      name: `${p.purchase_no} - ${p.content} (¥${p.amount})`,
      supplier_name: p.suppliers?.name || '',
      supplier_id: p.supplier_id,
      amount: p.amount,
    })) || [];
  };

  const handleProjectChange = async (projectId: string) => {
    setForm(prev => ({ ...prev, project_id: projectId, purchase_id: '' }));
    setSelectedPurchaseName('');
    if (projectId) {
      const { data: proj } = await supabase
        .from('projects')
        .select('name, client')
        .eq('id', projectId)
        .single();
      if (proj) {
        setSelectedProjectName(proj.name);
        if (!isInput && proj.client) setForm(prev => ({ ...prev, supplier_name: proj.client }));
      }
    } else {
      setSelectedProjectName('');
    }
  };

  // 类型切换时重置一些状态
  useEffect(() => {
    resetDependentOptions();
    setSupplierOptions([]);
    setSelectedSupplierName('');
  }, [form.type, resetDependentOptions]);

  if (!canEdit) return <div className="text-center py-12 text-red-500">无权限操作</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? '编辑发票' : '新建发票'}</h1>

      {/* 上传区域 */}
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
              disabled={ocrLoading}
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
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value as 'input' | 'output', purchase_id: '', supplier_id: '' }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="input">进项（收到发票）</option>
              <option value="output">销项（开出发票）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">发票号码 *</label>
            <input type="text" required value={form.invoice_no} onChange={e => setForm(prev => ({ ...prev, invoice_no: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">金额 *</label>
            <input type="number" step="0.01" required value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">税额</label>
            <input type="number" step="0.01" value={form.tax_amount} onChange={e => setForm(prev => ({ ...prev, tax_amount: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">总金额 *</label>
            <input type="number" step="0.01" required value={form.total_amount} readOnly className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
            <p className="text-xs text-gray-500">自动计算（金额 + 税额）</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">开票日期 *</label>
            <input type="date" required value={form.invoice_date} onChange={e => setForm(prev => ({ ...prev, invoice_date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
          </div>

          {/* 所属项目 */}
          <div>
            <label className="block text-sm font-medium mb-1">所属项目</label>
            <SearchSelect
              value={form.project_id}
              onChange={handleProjectChange}
              onSearch={searchProjects}
              placeholder="选择项目"
              displayName={selectedProjectName}
              initialOptions={projectOptions}
            />
            {form.supplier_name && !projectOptions.length && <p className="text-xs text-orange-500 mt-1">未找到匹配的项目，请手动选择</p>}
          </div>

          {/* 关联采购（仅进项） */}
          {isInput && (
            <div>
              <label className="block text-sm font-medium mb-1">关联采购（可选）</label>
              <SearchSelect
                value={form.purchase_id}
                onChange={(val, opt) => {
                  setForm(prev => ({ ...prev, purchase_id: val, supplier_name: opt?.supplier_name || '', supplier_id: opt?.supplier_id || '' }));
                  setSelectedPurchaseName(opt?.name || '');
                }}
                onSearch={handlePurchaseSearch}
                placeholder="选择采购单"
                displayName={selectedPurchaseName}
                initialOptions={purchaseOptions}
              />
              {form.project_id && form.supplier_id && !purchaseOptions.length && <p className="text-xs text-gray-500 mt-1">该项目下暂无该供应商的采购记录</p>}
            </div>
          )}

          {/* 对方名称 */}
          <div>
            <label className="block text-sm font-medium mb-1">对方名称 *</label>
            <input
              type="text"
              required
              value={form.supplier_name}
              onChange={e => setForm(prev => ({ ...prev, supplier_name: e.target.value, supplier_id: '' }))}
              placeholder={isInput ? '发票上的对方名称' : '甲方名称'}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* 关联供应商（仅进项） */}
          {isInput && (
            <div>
              <label className="block text-sm font-medium mb-1">关联供应商（可选）</label>
              <SearchSelect
                value={form.supplier_id}
                onChange={(val, opt) => opt && setForm(prev => ({ ...prev, supplier_id: val, supplier_name: opt.name }))}
                onSearch={searchSuppliers}
                placeholder="如对方是系统供应商，可选择关联"
                displayName={selectedSupplierName}
                initialOptions={supplierOptions}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">状态</label>
            <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
              <option value="unpaid">未付款</option>
              <option value="partial">部分付款</option>
              <option value="paid">已付款</option>
              <option value="cancelled">作废</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">备注</label>
            <textarea rows={3} value={form.remark} onChange={e => setForm(prev => ({ ...prev, remark: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
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