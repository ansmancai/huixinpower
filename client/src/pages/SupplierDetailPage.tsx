import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPurchases, setRelatedPurchases] = useState<any[]>([]);

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [supplierData, purchasesData] = await Promise.all([
          api.suppliers.get(id),
          api.purchases.list({ supplierId: id, pageSize: 100 }),
        ]);
        setSupplier(supplierData);
        setRelatedPurchases(purchasesData.data);
      } catch (error) {
        console.error('加载供应商详情失败', error);
        navigate('/suppliers');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!confirm(`确定要删除供应商 "${supplier?.name}" 吗？`)) return;
    try {
      await api.suppliers.delete(id!);
      navigate('/suppliers');
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!supplier) {
    return <div className="text-center py-12 text-gray-500">供应商不存在</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/suppliers" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回供应商列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{supplier.name}</h1>
          <p className="text-gray-500">编号：{supplier.code}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/suppliers/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              编辑供应商
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                删除供应商
              </button>
            )}
          </div>
        )}
      </div>

      {/* 供应商详细信息 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">基本信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">联系人</p>
            <p className="font-medium">{supplier.contactPerson || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">联系电话</p>
            <p className="font-medium">{supplier.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">邮箱</p>
            <p className="font-medium">{supplier.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">银行账户</p>
            <p className="font-medium">{supplier.bankAccount || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">税号</p>
            <p className="font-medium">{supplier.taxNumber || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">评级</p>
            <p className="font-medium">{supplier.rating ? `${supplier.rating} 星` : '-'}</p>
          </div>
        </div>
        {supplier.address && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">地址</p>
            <p className="mt-1 text-gray-700">{supplier.address}</p>
          </div>
        )}
      </div>

      {/* 相关采购 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">相关采购单</h2>
        {relatedPurchases.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无采购记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">采购单号</th>
                  <th className="px-4 py-2 text-left text-sm">名称</th>
                  <th className="px-4 py-2 text-right text-sm">金额</th>
                  <th className="px-4 py-2 text-center text-sm">状态</th>
                  <th className="px-4 py-2 text-left text-sm">下单日期</th>
                </tr>
              </thead>
              <tbody>
                {relatedPurchases.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2">
                      <Link to={`/purchases/${p.id}`} className="text-blue-600 hover:underline">
                        {p.purchaseNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{p.name}</td>
                    <td className="px-4 py-2 text-right">{p.totalAmount ? `¥${p.totalAmount}` : '-'}</td>
                    <td className="px-4 py-2 text-center">{p.status}</td>
                    <td className="px-4 py-2">{p.orderDate ? new Date(p.orderDate).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}