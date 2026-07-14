import XLSX from 'xlsx';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const PROJECT_STATUS_MAP = {
  ongoing: '进行中',
  completed: '已完成',
  pending_payment: '未收齐',
  suspended: '已暂停',
  planning: '规划中',
};

const SUPPLIER_CATEGORY_MAP = {
  equipment: '设备材料',
  installation: '安装',
  construction: '土建',
  other: '生活/其他',
};

const PURCHASE_LOGISTICS_MAP = {
  arrived: '已到货',
  ordered: '已下单',
  pending: '待发货',
};

const TRANSACTION_PAYMENT_METHOD_MAP = {
  bank: '银行转账',
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  draft: '汇票',
  check: '支票',
  other: '其他',
};

const INVOICE_STATUS_MAP = {
  unpaid: '未付款',
  paid: '已付款',
  partial: '部分付款',
  cancelled: '作废',
};

async function fetchTable(tableName) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  if (!response.ok) {
    throw new Error(`获取 ${tableName} 失败: ${response.statusText}`);
  }
  return response.json();
}

async function backup() {
  console.log('开始备份...', new Date().toLocaleString());
  
  // 获取所有需要关联的数据
  const [projects, suppliers, purchases] = await Promise.all([
    fetchTable('projects'),
    fetchTable('suppliers'),
    fetchTable('purchases'),
  ]);
  
  const projectNameMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const supplierNameMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));
  const purchaseNoMap = Object.fromEntries(purchases.map(p => [p.id, p.purchase_no]));
  
  const workbook = XLSX.utils.book_new();
  
  // ==================== 1. 项目表 ====================
  const projectsFormatted = projects.map(p => ({
    '项目编号': p.code,
    '项目名称': p.name,
    '项目状态': PROJECT_STATUS_MAP[p.status] || p.status,
    '甲方': p.client || '-',
    '乙方': p.contractor || '-',
    '合同编号': p.contract_no || '-',
    '合同金额': p.contract_amount,
    '开工日期': p.start_date || '-',
    '完工日期': p.end_date || '-',
    '备注': p.remark || '-',
  }));
  if (projectsFormatted.length) {
    const sheet = XLSX.utils.json_to_sheet(projectsFormatted);
    XLSX.utils.book_append_sheet(workbook, sheet, '项目');
  }
  console.log(`项目: ${projectsFormatted.length} 条记录`);
  
  // ==================== 2. 供应商表 ====================
  const suppliersFormatted = suppliers.map(s => ({
    '供应商编号': s.code,
    '供应商名称': s.name,
    '类别': SUPPLIER_CATEGORY_MAP[s.category] || s.category,
    '联系人': s.contact_person || '-',
    '联系电话': s.phone || '-',
    '地址': s.address || '-',
    '开户行': s.bank || '-',
    '账号': s.account || '-',
    '评级': s.rating ? `${s.rating} 星` : '-',
    '备注': s.remark || '-',
  }));
  if (suppliersFormatted.length) {
    const sheet = XLSX.utils.json_to_sheet(suppliersFormatted);
    XLSX.utils.book_append_sheet(workbook, sheet, '供应商');
  }
  console.log(`供应商: ${suppliersFormatted.length} 条记录`);
  
  // ==================== 3. 采购表 ====================
  const purchasesFormatted = purchases.map(p => ({
    '采购单号': p.purchase_no,
    '采购内容': p.content,
    '采购金额': p.amount,
    '采购日期': p.purchase_date,
    '物流状态': PURCHASE_LOGISTICS_MAP[p.logistics_status] || p.logistics_status,
    '所属项目': projectNameMap[p.project_id] || p.project_id || '-',
    '供应商': supplierNameMap[p.supplier_id] || p.supplier_id || '-',
    '备注': p.remark || '-',
  }));
  if (purchasesFormatted.length) {
    const sheet = XLSX.utils.json_to_sheet(purchasesFormatted);
    XLSX.utils.book_append_sheet(workbook, sheet, '采购');
  }
  console.log(`采购: ${purchasesFormatted.length} 条记录`);
  
  // ==================== 4. 收付款表 ====================
  const transactions = await fetchTable('transactions');
  const transactionsFormatted = transactions.map(t => {
    const amount = parseFloat(t.amount);
    return {
      '交易日期': t.date,
      '交易类型': t.type === 'receipt' ? '收款' : '付款',
      '金额': amount < 0 ? amount : (t.type === 'payment' ? -amount : amount),
      '支付方式': TRANSACTION_PAYMENT_METHOD_MAP[t.payment_method] || t.payment_method,
      '关联项目': projectNameMap[t.project_id] || t.project_id || '-',
      '关联供应商': supplierNameMap[t.supplier_id] || t.supplier_id || '-',
      '对方名称': t.type === 'payment' ? (supplierNameMap[t.supplier_id] || t.supplier_id) : (t.counterparty_name || '-'),
      '关联采购': purchaseNoMap[t.purchase_id] || t.purchase_id || '-',
      '备注': t.remark || '-',
    };
  });
  if (transactionsFormatted.length) {
    const sheet = XLSX.utils.json_to_sheet(transactionsFormatted);
    XLSX.utils.book_append_sheet(workbook, sheet, '收付款');
  }
  console.log(`收付款: ${transactionsFormatted.length} 条记录`);
  
  // ==================== 5. 发票表 ====================
  const invoices = await fetchTable('invoices');
  const invoicesFormatted = invoices.map(i => ({
    '发票类型': i.type === 'input' ? '进项' : '销项',
    '发票号码': i.invoice_no,
    '金额': i.amount,
    '税额': i.tax_amount || '-',
    '总金额': i.total_amount,
    '开票日期': i.invoice_date,
    '对方名称': supplierNameMap[i.supplier_id] || i.supplier_name || '-',
    '所属项目': projectNameMap[i.project_id] || i.project_id || '-',
    '关联采购': purchaseNoMap[i.purchase_id] || i.purchase_id || '-',
    '状态': INVOICE_STATUS_MAP[i.status] || i.status,
    '交付状态': i.delivered_at ? new Date(i.delivered_at).toLocaleDateString() : '未交付',
    '备注': i.remark || '-',
  }));
  if (invoicesFormatted.length) {
    const sheet = XLSX.utils.json_to_sheet(invoicesFormatted);
    XLSX.utils.book_append_sheet(workbook, sheet, '发票');
  }
  console.log(`发票: ${invoicesFormatted.length} 条记录`);
  
  const fileName = `电力财务系统备份_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  console.log(`备份完成：${fileName}`);
}

backup().catch(console.error);