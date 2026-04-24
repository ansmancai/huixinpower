import { useState } from 'react';

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
  const [formData] = useState({
    paymentNo: transaction?.receipt_no || transaction?.id?.slice(0, 8) || '',
    applicationDate: transaction?.date ? new Date(transaction.date).toLocaleDateString('zh-CN') : new Date().toLocaleDateString('zh-CN'),
    projectName: project?.name || '',
    projectCode: project?.code || '',
    purpose: purchase?.content || transaction?.remark || '',
    basis: '',
    contactPerson: project?.client || '',
    contactPhone: '',
    amount: transaction?.amount ? Math.abs(parseFloat(transaction.amount)) : 0,
    paymentMethod: transaction?.payment_method === 'bank' ? '银行转账' : 
                    transaction?.payment_method === 'cash' ? '现金' :
                    transaction?.payment_method === 'check' ? '支票' : '其他',
    includeTax: true,
    taxRate: 13,
    supplierName: supplier?.name || '',
    supplierAccount: supplier?.account || '',
    supplierBank: supplier?.bank || '',
    invoiceStatus: '未开票',
    remark: transaction?.remark || '',
    applicant: user?.name || '',
    finance: '',
    approver: '',
  });

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

  const handleCopy = () => {
    const content = document.getElementById('payment-content');
    if (!content) return;
    
    const range = document.createRange();
    range.selectNode(content);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    document.execCommand('copy');
    window.getSelection()?.removeAllRanges();
    
    alert('已复制付款申请单内容');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">付款申请单</h2>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              复制全部
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
        
        <div id="payment-content" className="p-6 overflow-auto flex-1">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">广东汇信电力建设有限公司</h2>
            <h3 className="text-xl font-semibold mt-2">付款申请单</h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">付款单编号</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.paymentNo}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">申请日期</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.applicationDate}</div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">工程名称</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">
                  {formData.projectName}{formData.projectCode ? `（${formData.projectCode}）` : ''}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">款项用途</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.purpose || '-'}</div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">付款依据</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.basis || '-'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">项目联系人</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.contactPerson || '-'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">联系电话</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.contactPhone || '-'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">申请金额（小写）</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">¥{formData.amount.toFixed(2)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">申请金额（大写）</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{amountToChinese(formData.amount)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">支付方式</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.paymentMethod}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">是否含税</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.includeTax ? '含税' : '不含税'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">税率</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.taxRate}%</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">收款单位</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.supplierName || '-'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">收款账号</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.supplierAccount || '-'}</div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">收款人开户行</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.supplierBank || '-'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">开票情况</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.invoiceStatus}</div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">备注</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.remark || '-'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">申请人</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.applicant}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">财务</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.finance || '______'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">审批</label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-gray-50">{formData.approver || '______'}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}