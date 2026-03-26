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
    paymentNo: `HXFB${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    applicationDate: new Date().toLocaleDateString('zh-CN'),
    projectName: project?.name || '',
    purpose: purchase?.content || transaction?.remark || '',
    amount: transaction?.amount ? Math.abs(parseFloat(transaction.amount)) : 0,
    paymentMethod: transaction?.payment_method === 'bank' ? '银行转账' : 
                    transaction?.payment_method === 'cash' ? '现金' :
                    transaction?.payment_method === 'check' ? '支票' : '其他',
    includeTax: true,
    taxRate: 0.13,
    supplierName: supplier?.name || '',
    supplierAccount: supplier?.account || '',
    supplierBank: supplier?.bank || '',
    remark: transaction?.remark || '',
    applicant: user?.name || '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // 构建数据数组（按 Excel 布局）
    const data = [
      ['广东汇信电力建设有限公司', '', '', '', '', ''],
      ['付款申请单', '', '', '', '', '编号规则：HX+FB（分包）或SB（设备材料）+年份2位+流水号3位'],
      ['', '', '', '工程名称：', formData.projectName, ''],
      ['付款单编号：', formData.paymentNo, '', '申请日期：', formData.applicationDate, ''],
      ['款项用途', formData.purpose, '', '', '', ''],
      ['付款依据', '', '', '项目联系人', '', ''],
      ['', '', '', '联系电话', '', ''],
      ['本次申请付款金额', `人民币（大写）：${amountToChinese(formData.amount)}`, '', `人民币（小写）：`, `${formData.amount}`, ''],
      ['支付方式', formData.paymentMethod === '银行转账' ? 'þ银行转账' : 
                   formData.paymentMethod === '现金' ? '□银行转账  þ现金' :
                   formData.paymentMethod === '支票' ? '□银行转账  □现金  þ支票' : '其他', '', '', '', ''],
      ['是否含税', formData.includeTax ? '含税' : '不含税', '', '发票类型', '□增值税专用票  □增值税普通票  □其他', ''],
      ['收款单位', formData.supplierName, '', '发票税率', `${formData.taxRate * 100}%`, ''],
      ['收款账号', formData.supplierAccount, '', '开票情况', '□已开票   □未开票   □其他', ''],
      ['收款人开户行', formData.supplierBank, '', '备 注', formData.remark, ''],
      ['申请人：', formData.applicant, '', '经办人：', '', '财务：', '', '审批：', '', ''],
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    // 设置列宽
    worksheet['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, '付款申请单');
    
    XLSX.writeFile(workbook, `付款申请单_${formData.paymentNo}.xlsx`);
    onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">付款申请单</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <div className="p-6 overflow-auto flex-1">
          <div className="space-y-4">
            {/* 第一行：公司名称 */}
            <div className="text-center">
              <h3 className="text-xl font-bold">广东汇信电力建设有限公司</h3>
              <h4 className="text-lg font-semibold mt-2">付款申请单</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">付款单编号</label>
                <input type="text" value={formData.paymentNo} onChange={(e) => handleChange('paymentNo', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium">申请日期</label>
                <input type="text" value={formData.applicationDate} onChange={(e) => handleChange('applicationDate', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium">工程名称</label>
                <input type="text" value={formData.projectName} onChange={(e) => handleChange('projectName', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium">款项用途</label>
                <input type="text" value={formData.purpose} onChange={(e) => handleChange('purpose', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium">申请金额（小写）</label>
                <input type="number" step="0.01" value={formData.amount} onChange={(e) => handleChange('amount', parseFloat(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium">申请金额（大写）</label>
                <input type="text" value={amountToChinese(formData.amount)} readOnly className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium">支付方式</label>
                <select value={formData.paymentMethod} onChange={(e) => handleChange('paymentMethod', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="银行转账">银行转账</option>
                  <option value="现金">现金</option>
                  <option value="支票">支票</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">是否含税</label>
                <select value={formData.includeTax ? '含税' : '不含税'} onChange={(e) => handleChange('includeTax', e.target.value === '含税')} className="w-full px-3 py-2 border rounded-lg">
                  <option value="含税">含税</option>
                  <option value="不含税">不含税</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">收款单位</label>
                <input type="text" value={formData.supplierName} onChange={(e) => handleChange('supplierName', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium">发票税率 (%)</label>
                <input type="number" step="0.01" value={formData.taxRate * 100} onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) / 100)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium">收款账号</label>
                <input type="text" value={formData.supplierAccount} onChange={(e) => handleChange('supplierAccount', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium">收款人开户行</label>
                <input type="text" value={formData.supplierBank} onChange={(e) => handleChange('supplierBank', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium">备注</label>
                <textarea rows={2} value={formData.remark} onChange={(e) => handleChange('remark', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium">申请人</label>
                <input type="text" value={formData.applicant} onChange={(e) => handleChange('applicant', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
          <button onClick={generateExcel} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            生成并下载
          </button>
        </div>
      </div>
    </div>
  );
}