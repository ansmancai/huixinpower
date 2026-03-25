import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/authStore';
import * as XLSX from 'xlsx';
import PaymentRequestModal from '../components/PaymentRequestModal';


export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [purchase, setPurchase] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: txData, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setTransaction(txData);
        
        if (txData.project_id) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('*')
            .eq('id', txData.project_id)
            .single();
          setProject(projectData);
        }
        
        if (txData.supplier_id) {
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', txData.supplier_id)
            .single();
          setSupplier(supplierData);
        }
        
        if (txData.purchase_id) {
          const { data: purchaseData } = await supabase
            .from('purchases')
            .select('*')
            .eq('id', txData.purchase_id)
            .single();
          setPurchase(purchaseData);
        }
      } catch (error) {
        console.error('加载交易详情失败', error);
        navigate('/transactions');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm(`确定要删除交易记录 "${transaction?.transaction_no || id}" 吗？`)) return;
    try {
      await supabase.from('transactions').delete().eq('id', id);
      navigate('/transactions');
    } catch (error: any) {
      alert(error.message);
    }
  };

  // 生成付款申请单
  const generatePaymentRequest = async () => {
    if (transaction.type !== 'payment') {
      alert('只有付款记录可以生成付款申请单');
      return;
    }
    setGenerating(true);
    try {
      const workbook = XLSX.utils.book_new();
      
      const data = [[
        '付款申请单',
        '',
        '',
        '',
        '',
        '',
      ], [], [
        '申请编号', `PA-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`,
        '申请日期', new Date().toLocaleDateString(),
        '申请金额', transaction.amount ? Math.abs(parseFloat(transaction.amount)) : '',
      ], [
        '付款类型', transaction.type === 'payment' ? '付款' : '收款',
        '支付方式', transaction.payment_method === 'bank' ? '银行转账' : transaction.payment_method === 'cash' ? '现金' : transaction.payment_method === 'wechat' ? '微信' : transaction.payment_method === 'alipay' ? '支付宝' : transaction.payment_method,
        '',
      ], [
        '关联项目', project?.name || transaction.project_id || '-',
        '关联供应商', supplier?.name || transaction.supplier_id || '-',
        '',
      ], [
        '关联采购', purchase?.purchase_no || transaction.purchase_id || '-',
        '',
        '',
      ], [], [
        '付款事由', transaction.remark || '',
      ], [], [
        '申请人', user?.name || '',
        '申请日期', new Date().toLocaleDateString(),
        '',
      ], [], [
        '审批意见', '',
        '',
        '',
      ], [], [
        '审批人', '',
        '审批日期', '',
        '',
      ]];
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, '付款申请单');
      
      const filename = `付款申请单_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      alert('付款申请单已生成并下载');
    } catch (error) {
      console.error('生成失败:', error);
      alert('生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  };

  const typeMap: Record<string, { label: string; color: string; bg: string }> = {
    payment: { label: '付款', color: 'text-red-600', bg: 'bg-red-50' },
    receipt: { label: '收款', color: 'text-green-600', bg: 'bg-green-50' },
  };

  const paymentMethodMap: Record<string, string> = {
    bank: '银行转账',
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    draft: '汇票',
    check: '支票',
    other: '其他',
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!transaction) {
    return <div className="text-center py-12 text-gray-500">交易记录不存在</div>;
  }

  const amount = parseFloat(transaction.amount);
  const absAmount = Math.abs(amount);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/transactions" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回交易列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">交易详情</h1>
          <p className="text-gray-500">交易编号：{transaction.transaction_no || id?.slice(0, 8)}</p>
        </div>
        <div className="flex gap-2">
          {transaction.type === 'payment' && (
  <button
    onClick={() => setShowPaymentModal(true)}
    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
  >
    📄 生成付款申请单
  </button>
       
)}
          {canEdit && (
            <button
              onClick={() => navigate(`/transactions/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑交易
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              删除交易
            </button>
          )}
        </div>
        <PaymentRequestModal
      isOpen={showPaymentModal}
      onClose={() => setShowPaymentModal(false)}
      transaction={transaction}
      project={project}
      supplier={supplier}
      purchase={purchase}
      user={user}
    /> 
      </div>

      {/* 交易基本信息 */}
      <div className={`rounded-lg shadow-md p-6 mb-6 ${typeMap[transaction.type]?.bg || 'bg-white'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold mb-4">
              {typeMap[transaction.type]?.label}交易
            </h2>
            <div className="text-4xl font-bold mb-4">
              <span className={typeMap[transaction.type]?.color}>
                {transaction.type === 'receipt' ? '+' : '-'} {formatAmount(absAmount)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-500">交易日期</p>
            <p className="font-medium">{new Date(transaction.date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">支付方式</p>
            <p className="font-medium">{paymentMethodMap[transaction.payment_method] || transaction.payment_method}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">币种</p>
            <p className="font-medium">CNY</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">所属项目</p>
            {project ? (
              <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                {project.name}
              </Link>
            ) : (
              <p className="font-medium">{transaction.project_id || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">供应商</p>
            {supplier ? (
              <Link to={`/suppliers/${supplier.id}`} className="text-blue-600 hover:underline">
                {supplier.name}
              </Link>
            ) : (
              <p className="font-medium">{transaction.supplier_id || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">关联采购</p>
            {purchase ? (
              <Link to={`/purchases/${purchase.id}`} className="text-blue-600 hover:underline">
                {purchase.purchase_no}
              </Link>
            ) : (
              <p className="font-medium">{transaction.purchase_id || '-'}</p>
            )}
          </div>
        </div>
        
        {transaction.remark && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">备注</p>
            <p className="mt-1 text-gray-700">{transaction.remark}</p>
          </div>
        )}
      </div>
    </div>
  );
}