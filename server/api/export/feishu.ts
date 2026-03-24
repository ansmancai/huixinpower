import { requireAuth, checkPermission } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../utils/response';
import { db } from '../../db';
import { projects, suppliers, purchases, transactions, invoices } from '../../db/schema';

// 飞书多维表格 API 配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID;

async function getFeishuTenantToken() {
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    }),
  });
  const data = await response.json();
  return data.tenant_access_token;
}

async function addRecordsToFeishu(records: any[]) {
  const token = await getFeishuTenantToken();
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: records }),
    }
  );
  return response.json();
}

export async function POST(request: Request) {
  try {
    const user = requireAuth(request);
    if (!checkPermission(user, 'finance')) {
      return errorResponse('权限不足，需要财务或管理员权限', 403);
    }

    const { dataType } = await request.json();

    let records: any[] = [];

    switch (dataType) {
      case 'projects':
        const projectsData = await db.select().from(projects);
        records = projectsData.map(p => ({
          fields: {
            项目编号: p.code,
            项目名称: p.name,
            状态: p.status,
            预算: p.budget,
            实际成本: p.actualCost,
            开始日期: p.startDate,
            结束日期: p.endDate,
          },
        }));
        break;

      case 'suppliers':
        const suppliersData = await db.select().from(suppliers);
        records = suppliersData.map(s => ({
          fields: {
            供应商编号: s.code,
            供应商名称: s.name,
            联系人: s.contactPerson,
            电话: s.phone,
            邮箱: s.email,
            评级: s.rating,
          },
        }));
        break;

      case 'purchases':
        const purchasesData = await db.select().from(purchases);
        records = purchasesData.map(p => ({
          fields: {
            采购单号: p.purchaseNo,
            采购名称: p.name,
            数量: p.quantity,
            单价: p.unitPrice,
            总金额: p.totalAmount,
            状态: p.status,
            下单日期: p.orderDate,
          },
        }));
        break;

      case 'transactions':
        const transactionsData = await db.select().from(transactions);
        records = transactionsData.map(t => ({
          fields: {
            交易编号: t.transactionNo,
            类型: t.type === 'payment' ? '付款' : '收款',
            金额: t.amount,
            交易日期: t.transactionDate,
            状态: t.status,
            支付方式: t.paymentMethod,
          },
        }));
        break;

      case 'invoices':
        const invoicesData = await db.select().from(invoices);
        records = invoicesData.map(i => ({
          fields: {
            发票号: i.invoiceNo,
            类型: i.type === 'purchase' ? '采购发票' : '销售发票',
            金额: i.amount,
            税额: i.taxAmount,
            总金额: i.totalAmount,
            开票日期: i.invoiceDate,
            状态: i.status,
          },
        }));
        break;

      default:
        return errorResponse('不支持的数据类型');
    }

    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_BASE_TOKEN) {
      // 如果没有配置飞书，返回模拟成功（用于测试）
      return successResponse({
        mock: true,
        count: records.length,
        message: '飞书未配置，数据导出模拟成功',
      });
    }

    const result = await addRecordsToFeishu(records);
    return successResponse(result, `成功导出 ${records.length} 条数据到飞书`);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}