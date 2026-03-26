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
  // 生成付款单编号：HXXT + 年月日 + 流水号
  const generatePaymentNo = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `HXXT${year}${month}${day}${random}`;
  };

  const [formData, setFormData] = useState({
    projectName: project?.name || '',
    projectCode: project?.code || '',
    paymentNo: generatePaymentNo(),
    purpose: purchase?.content || transaction?.remark || '',
    basis: '',  // 付款依据，用户手动填
    amount: transaction?.amount ? Math.abs(parseFloat(transaction.amount)) : 0,
    supplierName: supplier?.name || '',
    supplierAccount: supplier?.account || '',
    supplierBank: supplier?.bank || '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 金额转大写
  const amountToChinese = (amount: number) => {
    if (amount === 0) return '零元整';
    const cnNums = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const cnIntRadice = ['', '拾', '佰', '仟'];
    const cnIntUnits = ['', '万', '亿', '兆'];
    const cnDecUnits = ['角', '分'];
    const cnInteger = '整';
    const cnIntLast = '元';
    let integerNum = Math.floor(amount);
    let decimalNum = Math.round((amount - integerNum) * 100);
    let chineseStr = '';
    
    if (integerNum > 0) {
      let str = '';
      let zeroCount = 0;
      for (let i = 0; integerNum > 0; i++) {
        const part = integerNum % 10;
        if (part === 0) {
          zeroCount++;
        } else {
          if (zeroCount > 0) str = cnNums[0] + str;
          zeroCount = 0;
          str = cnNums[part] + cnIntRadice[i % 4] + str;
        }
        if (i % 4 === 3 && i > 0) {
          str = cnIntUnits[Math.floor(i / 4)] + str;
        }
        integerNum = Math.floor(integerNum / 10);
      }
      chineseStr = str + cnIntLast;
    }
    
    if (decimalNum > 0) {
      const jiao = Math.floor(decimalNum / 10);
      const fen = decimalNum % 10;
      if (jiao > 0) chineseStr += cnNums[jiao] + cnDecUnits[0];
      if (fen > 0) chineseStr += cnNums[fen] + cnDecUnits[1];
    } else {
      chineseStr += cnInteger;
    }
    
    return chineseStr;
  };

  const generateExcel = () => {
    const data = [
      ['项目名称+项目编号', `${formData.projectName} (${formData.projectCode})`],
      ['付款单编号', formData.paymentNo],
      ['款项用途', formData.purpose],
      ['付款依据', formData.basis],
      ['申请金额（大写）', amountToChinese(formData.amount)],
      ['申请金额（小写）', formData.amount],
      ['收款单位名称', formData.supplierName],
      ['收款账号', formData.supplierAccount],
      ['开户行', formData.supplierBank],
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '付款申请单');
    XLSX.writeFile(workbook, `付款申请单_${formData.paymentNo}.xlsx`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">付款申请单</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <div className="p-6 overflow-auto flex-1">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">1. 项目名称+项目编号</label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => handleChange('projectName', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="项目名称 (项目编号)"
              />
              <input
                type="text"
                value={formData.projectCode}
                onChange={(e) => handleChange('projectCode', e.target.value)}
                className="w-full mt-2 px-3 py-2 border rounded-lg"
                placeholder="项目编号"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">2. 付款单编号</label>
              <input
                type="text"
                value={formData.paymentNo}
                onChange={(e) => handleChange('paymentNo', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">3. 款项用途</label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => handleChange('purpose', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">4. 付款依据</label>
              <input
                type="text"
                value={formData.basis}
                onChange={(e) => handleChange('basis', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="合同名称/合同号"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">5. 申请金额（大写）</label>
              <input
                type="text"
                value={amountToChinese(formData.amount)}
                readOnly
                className="w-full px-3 py-2 border rounded-lg bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">6. 申请金额（小写）</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">7. 收款单位名称</label>
              <input
                type="text"
                value={formData.supplierName}
                onChange={(e) => handleChange('supplierName', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">8. 收款账号</label>
              <input
                type="text"
                value={formData.supplierAccount}
                onChange={(e) => handleChange('supplierAccount', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">9. 开户行</label>
              <input
                type="text"
                value={formData.supplierBank}
                onChange={(e) => handleChange('supplierBank', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            取消
          </button>
          <button
            onClick={generateExcel}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            生成并下载
          </button>
        </div>
      </div>
    </div>
  );
}