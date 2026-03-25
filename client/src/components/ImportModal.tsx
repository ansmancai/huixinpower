import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase, logOperation } from '../api/client';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  module: string;
  moduleName: string;
}

// 字段映射配置
const fieldMappings: Record<string, { label: string; required?: boolean; type?: string }[]> = {
  projects: [
    { label: '项目名称', key: 'name', required: true },
    { label: '项目状态', key: 'status', required: false, transform: (v: string) => statusMap[v] },
    { label: '项目编号', key: 'code', required: true },
    { label: '甲方', key: 'client' },
    { label: '乙方', key: 'contractor' },
    { label: '合同编号', key: 'contract_no' },
    { label: '合同金额', key: 'contract_amount', type: 'number' },
    { label: '开工日期', key: 'start_date', type: 'date' },
    { label: '完工日期', key: 'end_date', type: 'date' },
    { label: '备注', key: 'remark' },
  ],
  suppliers: [
    { label: '供应商编号', key: 'code', required: true },
    { label: '供应商名称', key: 'name', required: true },
    { label: '类别', key: 'category', transform: (v: string) => categoryMap[v] },
    { label: '联系人', key: 'contact_person' },
    { label: '联系电话', key: 'phone' },
    { label: '地址', key: 'address' },
    { label: '开户行', key: 'bank' },
    { label: '账号', key: 'account' },
    { label: '评级', key: 'rating', type: 'number' },
    { label: '备注', key: 'remark' },
  ],
  purchases: [
    { label: '采购单号', key: 'purchase_no', required: true },
    { label: '物流状态', key: 'logistics_status', transform: (v: string) => logisticsMap[v] },
    { label: '所属项目', key: 'project_name' },
    { label: '供应商', key: 'supplier_name' },
    { label: '采购日期', key: 'purchase_date', type: 'date', required: true },
    { label: '采购金额', key: 'amount', type: 'number', required: true },
    { label: '采购内容', key: 'content', required: true },
    { label: '备注', key: 'remark' },
  ],
  transactions: [
    { label: '日期', key: 'date', type: 'date', required: true },
    { label: '类型', key: 'type', transform: (v: string) => typeMap[v] },
    { label: '金额', key: 'amount', type: 'number', required: true },
    { label: '支付方式', key: 'payment_method', transform: (v: string) => paymentMethodMap[v] },
    { label: '关联项目', key: 'project_name' },
    { label: '关联供应商', key: 'supplier_name' },
    { label: '关联采购', key: 'purchase_no' },
    { label: '备注', key: 'remark' },
  ],
  invoices: [
    { label: '发票类型', key: 'type', transform: (v: string) => invoiceTypeMap[v] },
    { label: '发票号码', key: 'invoice_no', required: true },
    { label: '金额', key: 'amount', type: 'number', required: true },
    { label: '税额', key: 'tax_amount', type: 'number' },
    { label: '总金额', key: 'total_amount', type: 'number' },
    { label: '开票日期', key: 'invoice_date', type: 'date', required: true },
    { label: '对方名称', key: 'supplier_name' },
    { label: '所属项目', key: 'project_name' },
    { label: '关联采购', key: 'purchase_no' },
    { label: '状态', key: 'status', transform: (v: string) => invoiceStatusMap[v] },
    { label: '备注', key: 'remark' },
  ],
};

// 状态映射
const statusMap: Record<string, string> = {
  '进行中': 'ongoing', '已完成': 'completed', '未收齐': 'pending_payment', '已暂停': 'suspended', '规划中': 'planning'
};
const categoryMap: Record<string, string> = {
  '设备材料': 'equipment', '安装': 'installation', '土建': 'construction', '生活/其他': 'other'
};
const logisticsMap: Record<string, string> = {
  '已到货': 'arrived', '已下单': 'ordered', '待发货': 'pending'
};
const typeMap: Record<string, string> = {
  '收款': 'receipt', '付款': 'payment'
};
const paymentMethodMap: Record<string, string> = {
  '银行转账': 'bank', '现金': 'cash', '微信': 'wechat', '支付宝': 'alipay', '汇票': 'draft', '支票': 'check', '其他': 'other'
};
const invoiceTypeMap: Record<string, string> = {
  '进项': 'input', '销项': 'output'
};
const invoiceStatusMap: Record<string, string> = {
  '未付款': 'unpaid', '已付款': 'paid', '作废': 'cancelled'
};

// 获取模板数据
const getTemplateData = (module: string) => {
  const fields = fieldMappings[module];
  if (!fields) return [];
  
  const templateRow: any = {};
  fields.forEach(f => {
    templateRow[f.label] = f.label === '项目状态' ? '进行中' : 
                           f.label === '类别' ? '设备材料' :
                           f.label === '物流状态' ? '已下单' :
                           f.label === '类型' ? '收款' :
                           f.label === '支付方式' ? '银行转账' :
                           f.label === '发票类型' ? '进项' :
                           f.label === '状态' ? '未付款' :
                           '示例';
  });
  return [templateRow];
};

export default function ImportModal({ isOpen, onClose, onSuccess, module, moduleName }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const downloadTemplate = () => {
    const templateData = getTemplateData(module);
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '模板');
    XLSX.writeFile(workbook, `${moduleName}_导入模板.xlsx`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      
      const fields = fieldMappings[module];
      if (!fields) {
        setErrors(['模块配置错误']);
        return;
      }
      
      const newErrors: string[] = [];
      const validRows: any[] = [];
      
      rows.forEach((row: any, idx: number) => {
        const newRow: any = {};
        
        for (const field of fields) {
          let value = row[field.label];
          
          // 检查必填
          if (field.required && (!value || value === '')) {
            newErrors.push(`第 ${idx + 2} 行：${field.label} 不能为空`);
            continue;
          }
          
          if (value && value !== '') {
            // 类型转换
            if (field.type === 'number') {
              value = parseFloat(String(value).replace(/,/g, ''));
              if (isNaN(value)) {
                newErrors.push(`第 ${idx + 2} 行：${field.label} 格式错误`);
                continue;
              }
            } else if (field.type === 'date') {
              if (typeof value === 'number') {
                value = XLSX.SSF.format('yyyy-mm-dd', value);
              } else if (typeof value === 'string') {
                value = value.replace(/\//g, '-').split(' ')[0];
              }
            }
            
            // 转换中文值
            if (field.transform) {
              const transformed = field.transform(value);
              if (transformed) {
                value = transformed;
              } else if (field.required) {
                newErrors.push(`第 ${idx + 2} 行：${field.label} 值 "${value}" 无效`);
                continue;
              }
            }
          }
          
          newRow[field.key] = value || null;
        }
        
        if (Object.keys(newRow).length > 0) {
          validRows.push(newRow);
        }
      });
      
      setPreviewData(validRows);
      setErrors(newErrors);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      alert('没有有效数据可导入');
      return;
    }
    
    setImporting(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const row of previewData) {
      try {
        // 处理关联字段
        let processedRow = { ...row };
        
        // 关联项目名称 → ID
        if (row.project_name) {
          const { data } = await supabase.from('projects').select('id').eq('name', row.project_name).maybeSingle();
          if (data) {
            processedRow.project_id = data.id;
          }
          delete processedRow.project_name;
        }
        
        // 关联供应商名称 → ID
        if (row.supplier_name) {
          const { data } = await supabase.from('suppliers').select('id').eq('name', row.supplier_name).maybeSingle();
          if (data) {
            processedRow.supplier_id = data.id;
          }
          delete processedRow.supplier_name;
        }
        
        // 关联采购单号 → ID
        if (row.purchase_no) {
          const { data } = await supabase.from('purchases').select('id').eq('purchase_no', row.purchase_no).maybeSingle();
          if (data) {
            processedRow.purchase_id = data.id;
          }
          delete processedRow.purchase_no;
        }
        
        processedRow.id = crypto.randomUUID();
        processedRow.created_at = new Date().toISOString();
        processedRow.updated_at = new Date().toISOString();
        
        const { error } = await supabase.from(module).insert([processedRow]);
        if (error) throw error;
        successCount++;
      } catch (error: any) {
        console.error('导入失败:', error);
        failCount++;
      }
    }
    
    await logOperation('import', module, { total: previewData.length, success: successCount, fail: failCount });
    alert(`导入完成！成功: ${successCount} 条，失败: ${failCount} 条`);
    setImporting(false);
    onClose();
    onSuccess();
  };

  const fields = fieldMappings[module];
  const requiredFields = fields?.filter(f => f.required).map(f => f.label).join('、') || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">导入{moduleName}</h2>
          <div className="flex gap-3">
            <button
              onClick={downloadTemplate}
              className="text-blue-600 text-sm hover:underline px-3 py-1 border border-blue-600 rounded"
            >
              📥 下载模板
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>
        
        <div className="p-4 overflow-auto flex-1">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">选择 Excel 文件</label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              必填字段：{requiredFields || '无'}
              <br />
              关联字段请填写名称（如：所属项目填项目名称），系统会自动匹配
            </p>
          </div>
          
          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg max-h-40 overflow-auto">
              <p className="text-red-600 font-medium mb-2">错误列表：</p>
              {errors.map((err, i) => (
                <p key={i} className="text-red-500 text-sm">{err}</p>
              ))}
            </div>
          )}
          
          {previewData.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">数据预览（共 {previewData.length} 条）</p>
              <div className="border rounded-lg overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0] || {}).map(key => (
                        <th key={key} className="px-3 py-2 text-left">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {Object.values(row).map((val: any, i) => (
                          <td key={i} className="px-3 py-1">{val !== null ? String(val) : '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <p className="text-center text-gray-500 text-sm py-2">... 还有 {previewData.length - 10} 条</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
          <button
            onClick={handleImport}
            disabled={importing || previewData.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  );
}