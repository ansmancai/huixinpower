import * as XLSX from 'xlsx';
import { supabase, logOperation } from '../api/client';

// 定义所有需要备份的表
const TABLES = ['projects', 'suppliers', 'purchases', 'transactions', 'invoices'];

// 表名映射到中文名称
const TABLE_NAMES_CN: Record<string, string> = {
  projects: '项目',
  suppliers: '供应商',
  purchases: '采购',
  transactions: '收付款',
  invoices: '发票',
};

// 导出所有数据为 Excel（多 Sheet）
export async function backupAllData() {
  try {
    const workbook = XLSX.utils.book_new();
    
    // 获取项目、供应商的映射（用于后续转换）
    const { data: projectsMap } = await supabase.from('projects').select('id, name');
    const { data: suppliersMap } = await supabase.from('suppliers').select('id, name');
    const { data: purchasesMap } = await supabase.from('purchases').select('id, purchase_no');
    
    const projectNameMap = Object.fromEntries(projectsMap?.map(p => [p.id, p.name]) || []);
    const supplierNameMap = Object.fromEntries(suppliersMap?.map(s => [s.id, s.name]) || []);
    const purchaseNoMap = Object.fromEntries(purchasesMap?.map(p => [p.id, p.purchase_no]) || []);
    
    // 1. 项目表 - 转中文
    const { data: projects } = await supabase.from('projects').select('*');
    const projectsFormatted = projects?.map(p => ({
      项目编号: p.code,
      项目名称: p.name,
      项目状态: p.status === 'ongoing' ? '进行中' : 
                p.status === 'completed' ? '已完成' :
                p.status === 'pending_payment' ? '未收齐' :
                p.status === 'suspended' ? '已暂停' : '规划中',
      甲方: p.client,
      乙方: p.contractor,
      合同编号: p.contract_no,
      合同金额: p.contract_amount,
      开工日期: p.start_date,
      完工日期: p.end_date,
      备注: p.remark,
    }));
    if (projectsFormatted?.length) {
      const sheet = XLSX.utils.json_to_sheet(projectsFormatted);
      XLSX.utils.book_append_sheet(workbook, sheet, '项目');
    }
    
    // 2. 供应商表 - 转中文
    const { data: suppliers } = await supabase.from('suppliers').select('*');
    const suppliersFormatted = suppliers?.map(s => ({
      供应商编号: s.code,
      供应商名称: s.name,
      类别: s.category === 'equipment' ? '设备材料' :
            s.category === 'installation' ? '安装' :
            s.category === 'construction' ? '土建' : '生活/其他',
      联系人: s.contact_person,
      联系电话: s.phone,
      地址: s.address,
      开户行: s.bank,
      账号: s.account,
      评级: s.rating,
      备注: s.remark,
    }));
    if (suppliersFormatted?.length) {
      const sheet = XLSX.utils.json_to_sheet(suppliersFormatted);
      XLSX.utils.book_append_sheet(workbook, sheet, '供应商');
    }
    
    // 3. 采购表 - 转换 ID 为名称
    const { data: purchases } = await supabase.from('purchases').select('*');
    const purchasesFormatted = purchases?.map(p => ({
      采购单号: p.purchase_no,
      物流状态: p.logistics_status === 'arrived' ? '已到货' : p.logistics_status === 'ordered' ? '已下单' : '待发货',
      所属项目: projectNameMap[p.project_id] || p.project_id,
      供应商: supplierNameMap[p.supplier_id] || p.supplier_id,
      采购日期: p.purchase_date,
      采购金额: p.amount,
      采购内容: p.content,
      备注: p.remark,
    }));
    if (purchasesFormatted?.length) {
      const sheet = XLSX.utils.json_to_sheet(purchasesFormatted);
      XLSX.utils.book_append_sheet(workbook, sheet, '采购');
    }
    
    // 4. 收付款表
    const { data: transactions } = await supabase.from('transactions').select('*');
    const transactionsFormatted = transactions?.map(t => ({
      日期: t.date,
      类型: t.type === 'receipt' ? '收款' : '付款',
      金额: t.amount,
      支付方式: t.payment_method === 'bank' ? '银行转账' : 
                t.payment_method === 'cash' ? '现金' :
                t.payment_method === 'wechat' ? '微信' :
                t.payment_method === 'alipay' ? '支付宝' : t.payment_method,
      关联项目: projectNameMap[t.project_id] || t.project_id,
      关联供应商: supplierNameMap[t.supplier_id] || t.supplier_id,
      关联采购: purchaseNoMap[t.purchase_id] || t.purchase_id,
      备注: t.remark,
    }));
    if (transactionsFormatted?.length) {
      const sheet = XLSX.utils.json_to_sheet(transactionsFormatted);
      XLSX.utils.book_append_sheet(workbook, sheet, '收付款');
    }
    
    // 5. 发票表
    const { data: invoices } = await supabase.from('invoices').select('*');
    const invoicesFormatted = invoices?.map(i => ({
      发票类型: i.type === 'input' ? '进项' : '销项',
      发票号码: i.invoice_no,
      金额: i.amount,
      税额: i.tax_amount,
      总金额: i.total_amount,
      开票日期: i.invoice_date,
      对方名称: supplierNameMap[i.supplier_id] || i.supplier_id,
      所属项目: projectNameMap[i.project_id] || i.project_id,
      关联采购: purchaseNoMap[i.purchase_id] || i.purchase_id,
      状态: i.status === 'paid' ? '已付款' : i.status === 'partial' ? '部分付款' : i.status === 'cancelled' ? '作废' : '未付款',
      备注: i.remark,
    }));
    if (invoicesFormatted?.length) {
      const sheet = XLSX.utils.json_to_sheet(invoicesFormatted);
      XLSX.utils.book_append_sheet(workbook, sheet, '发票');
    }
    
    const filename = `电力财务系统备份_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    await logOperation('backup', 'all', { tables: TABLES });
    return { success: true, message: '备份成功' };
  } catch (error: any) {
    console.error('备份失败:', error);
    return { success: false, message: error.message };
  }
}

// 导出单个模块数据（用于各列表页的导出按钮）
export async function exportModuleData(
  module: string,
  filter?: Record<string, any>,
  fileName?: string
) {
  try {
    let query = supabase.from(module).select('*');
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value && value !== 'all') {
          query = query.eq(key, value);
        }
      });
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    // 转换 ID 为名称，字段转中文
    let formattedData = data || [];
    
    if (module === 'projects') {
      formattedData = data?.map(p => ({
        项目编号: p.code,
        项目名称: p.name,
        项目状态: p.status === 'ongoing' ? '进行中' : 
                  p.status === 'completed' ? '已完成' :
                  p.status === 'pending_payment' ? '未收齐' :
                  p.status === 'suspended' ? '已暂停' : '规划中',
        甲方: p.client,
        乙方: p.contractor,
        合同编号: p.contract_no,
        合同金额: p.contract_amount,
        开工日期: p.start_date,
        完工日期: p.end_date,
        备注: p.remark,
      })) || [];
    } else if (module === 'suppliers') {
      formattedData = data?.map(s => ({
        供应商编号: s.code,
        供应商名称: s.name,
        类别: s.category === 'equipment' ? '设备材料' :
              s.category === 'installation' ? '安装' :
              s.category === 'construction' ? '土建' : '生活/其他',
        联系人: s.contact_person,
        联系电话: s.phone,
        地址: s.address,
        开户行: s.bank,
        账号: s.account,
        评级: s.rating,
        备注: s.remark,
      })) || [];
    } else if (module === 'purchases') {
      const { data: projects } = await supabase.from('projects').select('id, name');
      const { data: suppliers } = await supabase.from('suppliers').select('id, name');
      const projectMap = Object.fromEntries(projects?.map(p => [p.id, p.name]) || []);
      const supplierMap = Object.fromEntries(suppliers?.map(s => [s.id, s.name]) || []);
      
      formattedData = data?.map(p => ({
        采购单号: p.purchase_no,
        物流状态: p.logistics_status === 'arrived' ? '已到货' : p.logistics_status === 'ordered' ? '已下单' : '待发货',
        所属项目: projectMap[p.project_id] || p.project_id,
        供应商: supplierMap[p.supplier_id] || p.supplier_id,
        采购日期: p.purchase_date,
        采购金额: p.amount,
        采购内容: p.content,
        备注: p.remark,
      })) || [];
    } else if (module === 'transactions') {
      const { data: projects } = await supabase.from('projects').select('id, name');
      const { data: suppliers } = await supabase.from('suppliers').select('id, name');
      const { data: purchases } = await supabase.from('purchases').select('id, purchase_no');
      const projectMap = Object.fromEntries(projects?.map(p => [p.id, p.name]) || []);
      const supplierMap = Object.fromEntries(suppliers?.map(s => [s.id, s.name]) || []);
      const purchaseMap = Object.fromEntries(purchases?.map(p => [p.id, p.purchase_no]) || []);
      
      formattedData = data?.map(t => ({
        日期: t.date,
        类型: t.type === 'receipt' ? '收款' : '付款',
        金额: t.amount,
        支付方式: t.payment_method === 'bank' ? '银行转账' : 
                  t.payment_method === 'cash' ? '现金' :
                  t.payment_method === 'wechat' ? '微信' :
                  t.payment_method === 'alipay' ? '支付宝' : t.payment_method,
        关联项目: projectMap[t.project_id] || t.project_id,
        关联供应商: supplierMap[t.supplier_id] || t.supplier_id,
        关联采购: purchaseMap[t.purchase_id] || t.purchase_id,
        备注: t.remark,
      })) || [];
    } else if (module === 'invoices') {
      const { data: projects } = await supabase.from('projects').select('id, name');
      const { data: suppliers } = await supabase.from('suppliers').select('id, name');
      const { data: purchases } = await supabase.from('purchases').select('id, purchase_no');
      const projectMap = Object.fromEntries(projects?.map(p => [p.id, p.name]) || []);
      const supplierMap = Object.fromEntries(suppliers?.map(s => [s.id, s.name]) || []);
      const purchaseMap = Object.fromEntries(purchases?.map(p => [p.id, p.purchase_no]) || []);
      
      formattedData = data?.map(i => ({
        发票类型: i.type === 'input' ? '进项' : '销项',
        发票号码: i.invoice_no,
        金额: i.amount,
        税额: i.tax_amount,
        总金额: i.total_amount,
        开票日期: i.invoice_date,
        对方名称: supplierMap[i.supplier_id] || i.supplier_id,
        所属项目: projectMap[i.project_id] || i.project_id,
        关联采购: purchaseMap[i.purchase_id] || i.purchase_id,
        状态: i.status === 'paid' ? '已付款' : i.status === 'partial' ? '部分付款' : i.status === 'cancelled' ? '作废' : '未付款',
        备注: i.remark,
      })) || [];
    }
    
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, module);
    
    const finalFileName = fileName || `${module}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
    XLSX.writeFile(workbook, finalFileName);
    
    await logOperation('export', module, { filter });
    return { success: true, message: '导出成功' };
  } catch (error: any) {
    console.error('导出失败:', error);
    return { success: false, message: error.message || '导出失败' };
  }
}