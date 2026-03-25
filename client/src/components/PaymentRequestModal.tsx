import { useState } from 'react';
import * as XLSX from 'xlsx';

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  project?: any;
  supplier?: any;
  purchase?: any;
  user: any;
}

export default function PaymentRequestModal({
  isOpen,
  onClose,
  transaction,
  project,
  supplier,
  purchase,
  user,
}: PaymentRequestModalProps) {
  const [formData, setFormData] = useState({
    applicationNo: `PA-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`,
    applicationDate: new Date().toLocaleDateString(),
    amount: transaction?.amount ? Math.abs(parseFloat(transaction.amount)) : 0,
    paymentType: transaction?.type === 'payment' ? '付款' : '收款',
    paymentMethod: transaction?.payment_method === 'bank' ? '银行转账' : 
                    transaction?.payment_method === 'cash' ? '现金' :
                    transaction?.payment_method === 'wechat' ? '微信' :
                    transaction?.payment_method === 'alipay' ? '支付宝' : transaction?.payment_method,
    projectName: project?.name || transaction?.project_id || '-',
    supplierName: supplier?.name || transaction?.supplier_id || '-',
    purchaseNo: purchase?.purchase_no || transaction?.purchase_id || '-',
    reason: transaction?.remark || '',
    applicant: user?.name || '',
    applicantDate: new Date().toLocaleDateString(),
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['付款申请单', '', '', '', '', ''],
      [],
      ['申请编号', formData.applicationNo, '申请日期', formData.applicationDate, '申请金额', `¥${formData.amount.toFixed(2)}`],
      ['付款类型', formData.paymentType, '支付方式', formData.paymentMethod, '', ''],
      ['关联项目', formData.projectName, '关联供应商', formData.supplierName, '', ''],
      ['关联采购', formData.purchaseNo, '', '', '', ''],
      [],
      ['付款事由', formData.reason, '', '', '', ''],
      [],
      ['申请人', formData.applicant, '申请日期', formData.applicantDate, '', ''],
      [],
      ['审批意见', '', '', '', '', ''],
      [],
      ['审批人', '', '审批日期', '', '', ''],
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    // 设置列宽
    worksheet['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, '付款申请单');
    
    const filename = `付款申请单_${formData.applicationNo}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    onClose();
    alert('付款申请单已生成并下载');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">付款申请单</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <div className="p-6 overflow-auto flex-1">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">申请编号</label>
                <input
                  type="text"
                  value={formData.applicationNo}
                  onChange={(e) => handleChange('applicationNo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">申请日期</label>
                <input
                  type="text"
                  value={formData.applicationDate}
                  onChange={(e) => handleChange('applicationDate', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">申请金额</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">付款类型</label>
                <input
                  type="text"
                  value={formData.paymentType}
                  onChange={(e) => handleChange('paymentType', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">支付方式</label>
                <input
                  type="text"
                  value={formData.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">关联项目</label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => handleChange('projectName', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">关联供应商</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => handleChange('supplierName', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">关联采购</label>
              <input
                type="text"
                value={formData.purchaseNo}
                onChange={(e) => handleChange('purchaseNo', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">付款事由</label>
              <textarea
                rows={3}
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">申请人</label>
                <input
                  type="text"
                  value={formData.applicant}
                  onChange={(e) => handleChange('applicant', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">申请日期</label>
                <input
                  type="text"
                  value={formData.applicantDate}
                  onChange={(e) => handleChange('applicantDate', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">审批意见</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="待审批" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">审批人</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="待审批" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            取消
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            生成并下载
          </button>
        </div>
      </div>
    </div>
  );
}