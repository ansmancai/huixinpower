import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/client';
import ExportButton from '../components/ExportButton';
import ImportModal from '../components/ImportModal';

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTimer, setSearchTimer] = useState<any>(null);
  const [summary, setSummary] = useState({ totalPurchase: 0, totalPaid: 0, totalInvoiced: 0 });

  const canEdit = user?.role === 'admin' || user?.role === 'finance';
  const canExport = user?.role === 'admin' || user?.role === 'finance';

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('suppliers').select('*');
      
      if (keyword) {
        query = query.or(`name.ilike.%${keyword}%,code.ilike.%${keyword}%`);
      }
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      // 获取每个供应商的采购、付款、收票统计
      const supplierIds = data?.map(s => s.id) || [];
      if (supplierIds.length > 0) {
        // 采购总额
        const { data: purchases } = await supabase
          .from('purchases')
          .select('supplier_id, amount')
          .in('supplier_id', supplierIds);
        
        // 付款总额
        const { data: payments } = await supabase
          .from('transactions')
          .select('supplier_id, amount')
          .eq('type', 'payment')
          .in('supplier_id', supplierIds);
        
        // 收票总额
        const { data: invoices } = await supabase
          .from('invoices')
          .select('supplier_id, total_amount')
          .eq('type', 'input')
          .in('supplier_id', supplierIds);
        
        const purchaseMap: Record<string, number> = {};
        const paymentMap: Record<string, number> = {};
        const invoiceMap: Record<string, number> = {};
        
        purchases?.forEach(p => {
          purchaseMap[p.supplier_id] = (purchaseMap[p.supplier_id] || 0) + parseFloat(p.amount);
        });
        payments?.forEach(p => {
          paymentMap[p.supplier_id] = (paymentMap[p.supplier_id] || 0) + Math.abs(parseFloat(p.amount));
        });
        invoices?.forEach(i => {
          invoiceMap[i.supplier_id] = (invoiceMap[i.supplier_id] || 0) + parseFloat(i.total_amount);
        });
        
        data?.forEach(s => {
          s.purchasedAmount = purchaseMap[s.id] || 0;
          s.paidAmount = paymentMap[s.id] || 0;
          s.invoicedAmount = invoiceMap[s.id] || 0;
        });
        
        // 计算汇总
        const totalPurchase = Object.values(purchaseMap).reduce((a, b) => a + b, 0);
        const totalPaid = Object.values(paymentMap).reduce((a, b) => a + b, 0);
        const totalInvoiced = Object.values(invoiceMap).reduce((a, b) => a + b, 0);
        setSummary({ totalPurchase, totalPaid, totalInvoiced });
      }
      
      setSuppliers(data || []);
    } catch (error) {
      console.error('加载供应商失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [category]);

  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      loadSuppliers();
    }, 300);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除供应商 "${name}" 吗？`)) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      loadSuppliers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const categoryMap: Record<string, string> = {
    equipment: '设备材料',
    installation: '安装',
    construction: '土建',
    other: '生活/其他',
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(amount);
  };

  

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">供应商管理</h1>
        <div className="flex gap-2">
          {canExport && (
            <ExportButton module="suppliers" moduleName="供应商" filter={{ category: category !== 'all' ? category : undefined }} />
          )}
          {canEdit && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                📥 导入数据
              </button>
              <button
                onClick={() => navigate('/suppliers/new')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + 新建供应商
              </button>
            </>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">已采购总额</p>
          <p className="text-xl font-bold text-blue-600">{formatAmount(summary.totalPurchase)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">已付款总额</p>
          <p className="text-xl font-bold text-green-600">{formatAmount(summary.totalPaid)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">已收票总额</p>
          <p className="text-xl font-bold text-orange-600">{formatAmount(summary.totalInvoiced)}</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="搜索供应商名称、编号..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">全部类别</option>
          <option value="equipment">设备材料</option>
          <option value="installation">安装</option>
          <option value="construction">土建</option>
          <option value="other">生活/其他</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">供应商编号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">供应商名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类别</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">联系人</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">联系电话</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">已采购</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">已付款</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">欠款</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">欠票</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.map((supplier) => {
                const purchased = supplier.purchasedAmount || 0;
                const paid = supplier.paidAmount || 0;
                const invoiced = supplier.invoicedAmount || 0;
                return (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{supplier.code}</td>
                    <td className="px-4 py-3">
                      <Link to={`/suppliers/${supplier.id}`} className="text-blue-600 hover:underline">
                        {supplier.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{categoryMap[supplier.category] || supplier.category}</td>
                    <td className="px-4 py-3 text-sm">{supplier.contact_person || '-'}</td>
                    <td className="px-4 py-3 text-sm">{supplier.phone || '-'}</td>
                    <td className="px-4 py-3 text-right">{formatAmount(purchased)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatAmount(paid)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatAmount(purchased - paid)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatAmount(purchased - invoiced)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Link to={`/suppliers/${supplier.id}`} className="text-blue-600 hover:text-blue-800 text-sm">查看</Link>
                        {canEdit && (
                          <Link to={`/suppliers/${supplier.id}/edit`} className="text-blue-600 hover:text-blue-800 text-sm">编辑</Link>
                        )}
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(supplier.id, supplier.name)} className="text-red-600 hover:text-red-800 text-sm">删除</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {suppliers.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无供应商数据</div>
          )}
        </div>
      )}

      <ImportModal
  isOpen={showImportModal}
  onClose={() => setShowImportModal(false)}
  onSuccess={() => {
    loadData();
    setShowImportModal(false);
  }}
  module="suppliers"
  moduleName="供应商"
 />
    </div>
  );
}