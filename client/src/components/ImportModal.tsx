import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase, logOperation } from '../api/client';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  module: string;
  moduleName: string;
  columns: { key: string; label: string; required?: boolean }[];
  transformRow?: (row: any) => Promise<any>; // 可选，用于转换关联字段
}

export default function ImportModal({
  isOpen,
  onClose,
  onSuccess,
  module,
  moduleName,
  columns,
  transformRow,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
      
      // 验证必填字段
      const newErrors: string[] = [];
      const validRows: any[] = [];
      
      rows.forEach((row: any, idx: number) => {
        const missingFields = columns
          .filter(col => col.required && !row[col.label])
          .map(col => col.label);
        
        if (missingFields.length > 0) {
          newErrors.push(`第 ${idx + 2} 行缺少必填字段: ${missingFields.join(', ')}`);
        } else {
          validRows.push(row);
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
        // 转换数据格式
        let insertData: any = {};
        for (const col of columns) {
          let value = row[col.label];
          // 处理空值
          if (value === undefined || value === null || value === '') {
            insertData[col.key] = null;
          } else {
            insertData[col.key] = value;
          }
        }
        
        // 如果有自定义转换函数
        if (transformRow) {
          insertData = await transformRow(insertData);
        }
        
        // 添加 ID 和时间戳
        insertData.id = crypto.randomUUID();
        insertData.created_at = new Date().toISOString();
        insertData.updated_at = new Date().toISOString();
        
        const { error } = await supabase.from(module).insert([insertData]);
        if (error) throw error;
        successCount++;
      } catch (error: any) {
        console.error('导入失败:', error);
        failCount++;
      }
    }
    
    // 记录日志
    await logOperation('import', module, { total: previewData.length, success: successCount, fail: failCount });
    
    alert(`导入完成！成功: ${successCount} 条，失败: ${failCount} 条`);
    setImporting(false);
    onClose();
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">导入{moduleName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <div className="p-4 overflow-auto flex-1">
          {/* 文件选择 */}
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
              支持 .xlsx, .xls, .csv 格式。必填字段: {columns.filter(c => c.required).map(c => c.label).join(', ')}
            </p>
          </div>
          
          {/* 错误提示 */}
          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg max-h-40 overflow-auto">
              <p className="text-red-600 font-medium mb-2">错误列表：</p>
              {errors.map((err, i) => (
                <p key={i} className="text-red-500 text-sm">{err}</p>
              ))}
            </div>
          )}
          
          {/* 数据预览 */}
          {previewData.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">数据预览（共 {previewData.length} 条）</p>
              <div className="border rounded-lg overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {columns.map(col => (
                        <th key={col.key} className="px-3 py-2 text-left">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {columns.map(col => (
                          <td key={col.key} className="px-3 py-1">{row[col.label] || '-'}</td>
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
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
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