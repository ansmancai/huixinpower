import { useEffect, useState, useRef } from 'react';
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
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
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
  const formRef = useRef<HTMLDivElement>(null);

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

  // 根据供应商ID加载关联的项目列表（用于OCR后缩小选择范围）
  const loadProjectsBySupplier = async (supplierId: string) => {
    if (!supplierId) return [];
    
    const { data: purchases } = await supabase
      .from('purchases')
      .select('project_id, projects(id, name)')
      .eq('supplier_id', supplierId)
      .not('project_id', 'is', null);
    
    if (!purchases || purchases.length === 0) return [];
    
    // 去重
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

  // ==================== OCR 粘贴识别功能 ====================
  const recognizeImage = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const response = await fetch('/api/ocr-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 })
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

  // 从OCR结果中提取付款关键信息（适配 words_result 数组格式）
  const extractPaymentFields = (ocrResult: any) => {
    const wordsArray = ocrResult.words_result || [];
    
    let amount = '';
    let date = '';
    let counterpartyName = '';
    
    for (let i = 0; i < wordsArray.length; i++) {
      const word = wordsArray[i].words || '';
      
      if (word.includes('金额（小写）') || word.includes('金额(小写)')) {
        if (i + 1 < wordsArray.length) {
          amount = wordsArray[i + 1].words || '';
        }
      }
      
      if (word.includes('交易日期')) {
        if (i + 1 < wordsArray.length) {
          date = wordsArray[i + 1].words || '';
        }
      }
      
      if (word.includes('收款人名称')) {
        if (i + 1 < wordsArray.length) {
          counterpartyName = wordsArray[i + 1].words || '';
        }
      }
    }
    
    if (amount) {
      amount = amount.replace(/,/g, '');
    }
    
    return { amount, date, counterpartyName };
  };

  // 根据对方名称匹配供应商
  const matchSupplier = async (name: string): Promise<any | null> => {
    if (!name) return null;
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .ilike('name', `%${name}%`)
      .limit(1);
    return data && data.length > 0 ? data[0] : null;
  };

  // 处理粘贴的图片
  const handlePaste = async (e: ClipboardEvent) => {
    // 只在新建模式下生效（编辑模式不触发，避免意外覆盖）
    if (isEdit) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;
    
    let imageFile: File | null = null;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        imageFile = item.getAsFile();
        break;
      }
    }
    
    if (!imageFile) return;
    
    e.preventDefault();
    setOcrProcessing(true);
    setOcrMessage('正在识别付款截图...');
    
    try {
      const ocrResult = await recognizeImage(imageFile);
      const { amount, date, counterpartyName } = extractPaymentFields(ocrResult);
      
      // 自动填充表单字段
      const updates: any = {};
      if (amount) updates.amount = amount;
      if (date) updates.date = date;
      updates.type = 'payment';
      updates.payment_method = 'bank';
      
      setFormData(prev => ({ ...prev, ...updates }));
      
      // 匹配供应商
      if (counterpartyName) {
        setOcrMessage(`识别到收款方：${counterpartyName}，正在匹配供应商...`);
        const matchedSupplier = await matchSupplier(counterpartyName);
        
        if (matchedSupplier) {
          setFormData(prev => ({ ...prev, supplier_id: matchedSupplier.id }));
          setSelectedSupplierName(matchedSupplier.name);
          setSupplierOptions([{ id: matchedSupplier.id, name: matchedSupplier.name }]);
          setOcrMessage(`✅ 已匹配供应商：${matchedSupplier.name}`);
          
          // 根据供应商加载关联的项目列表（缩小选择范围）
          const projectList = await loadProjectsBySupplier(matchedSupplier.id);
          if (projectList.length === 0) {
            setOcrMessage(`⚠️ 该供应商暂无关联项目，请手动选择项目`);
          } else if (projectList.length === 1) {
            setOcrMessage(`✅ 已自动关联项目：${projectList[0].name}，请确认`);
          } else {
            setOcrMessage(`✅ 已匹配供应商，请从下方列表中选择项目`);
          }
        } else {
          setOcrMessage(`⚠️ 未找到匹配的供应商“${counterpartyName}”，请手动选择`);
        }
      } else {
        setOcrMessage(`⚠️ 未能识别到收款方名称，请手动填写`);
      }
      
      // 3秒后清除提示消息
      setTimeout(() => setOcrMessage(''), 5000);
      
    } catch (error: any) {
      console.error('识别失败:', error);
      setOcrMessage(`❌ 识别失败：${error.message}`);
      setTimeout(() => setOcrMessage(''), 5000);
    } finally {
      setOcrProcessing(false);
    }
  };

  // 监听粘贴事件
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isEdit]); // 编辑模式下不触发

  if (!canEdit) {
    return <div className="text-center py-12 text-red-500">无权限操作</div>;
  }

  return (
    <div className="max-w-3xl mx-auto" ref={formRef}>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? '编辑收付款' : '新建收付款'}</h1>
      
      {/* OCR 提示区域 */}
      {!isEdit && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span className="text-sm text-blue-800">
              付款成功后截图，回到本页面按 <kbd className="px-2 py-0.5 bg-white border rounded">Ctrl+V</kbd> 粘贴，系统将自动识别金额、日期和供应商
            </span>
          </div>
          {ocrProcessing && (
            <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              {ocrMessage || '识别中...'}
            </div>
          )}
          {!ocrProcessing && ocrMessage && (
            <div className="mt-2 text-sm text-gray-600">
              {ocrMessage}
            </div>
          )}
        </div>
      )}
      
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
          
          {/* 关联项目 */}
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
            {selectedProjectName && (
              <p className="text-xs text-gray-500 mt-1">已选：{selectedProjectName}</p>
            )}
          </div>
          
          {/* 关联供应商 */}
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
            {selectedSupplierName && (
              <p className="text-xs text-gray-500 mt-1">已选：{selectedSupplierName}</p>
            )}
          </div>
          
          {/* 关联采购 */}
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
              placeholder="选填"
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