import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';

// ==================== Supabase 客户端 ====================
const supabaseUrl = 'https://sjgyvhceixyukfgplpts.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZ3l2aGNlaXh5dWtmZ3BscHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTg5ODcsImV4cCI6MjA4OTkzNDk4N30.1X0OGO5HGF22SHQlAPwDKsBIRW4DzDHWYm-cl6m-9YY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==================== 辅助函数 ====================
function handleError(error: any) {
  console.error('API Error:', error);
  throw new Error(error.message || '操作失败');
}

// ==================== 日志记录 ====================
export async function logOperation(
  action: string,
  tableName?: string,
  details?: any
) {
  try {
    // 获取当前用户
    const authStore = useAuthStore.getState();
    const userId = authStore.user?.id;
    const userName = authStore.user?.name;
    
    await supabase.from('operation_logs').insert({
      user_id: userId,
      user_name: userName,
      action,
      table_name: tableName,
      details: details || {},
    });
  } catch (error) {
    console.error('记录日志失败:', error);
  }
}

export async function logLogin(userId: string, userName: string, ip?: string, userAgent?: string) {
  try {
    await supabase.from('login_logs').insert({
      user_id: userId,
      user_name: userName,
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('记录登录日志失败:', error);
  }
}

// ==================== 认证 API ====================
export const authApi = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      throw new Error('用户不存在');
    }
    
    if (password !== 'admin123' && password !== '123456') {
      throw new Error('密码错误');
    }
    
    const token = btoa(JSON.stringify({ id: data.id, email: data.email, role: data.role }));
    
    // 记录登录日志
    await logLogin(data.id, data.name);
    
    return { token, user: data };
  },
  
  register: async (data: any) => {
    const { data: result, error } = await supabase
      .from('users')
      .insert([{ ...data, id: crypto.randomUUID(), created_at: new Date() }])
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  getProfile: async () => {
    const authStore = useAuthStore.getState();
    return authStore.user;
  },
};

// ==================== 项目管理 API ====================
export const projectsApi = {
  list: async (params?: { page?: number; pageSize?: number; keyword?: string; status?: string }) => {
    let query = supabase.from('projects').select('*', { count: 'exact' });
    
    if (params?.keyword) {
      query = query.or(`name.ilike.%${params.keyword}%,code.ilike.%${params.keyword}%`);
    }
    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }
    
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) handleError(error);
    
    return { data: data || [], total: count || 0, page, pageSize };
  },
  
  get: async (id: string) => {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
    if (error) handleError(error);
    return data;
  },
  
  create: async (data: any) => {
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        cleanedData[key] = null;
      } else if (key === 'contract_amount' && value !== null && value !== undefined && value !== '') {
        cleanedData[key] = parseFloat(value as string);
      } else {
        cleanedData[key] = value;
      }
    }
    
    const insertData = {
      ...cleanedData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data: result, error } = await supabase
      .from('projects')
      .insert([insertData])
      .select()
      .single();
    
    if (error) handleError(error);
    
    // 记录日志
    await logOperation('insert', 'projects', { id: result.id, data: result });
    
    return result;
  },
  
  update: async (id: string, data: any) => {
    // 先获取旧数据
    const { data: oldData } = await supabase.from('projects').select('*').eq('id', id).single();
    
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        cleanedData[key] = null;
      } else if (key === 'contract_amount' && value !== null && value !== undefined && value !== '') {
        cleanedData[key] = parseFloat(value as string);
      } else {
        cleanedData[key] = value;
      }
    }
    
    const { data: result, error } = await supabase
      .from('projects')
      .update({ ...cleanedData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error);
    
    // 记录日志
    await logOperation('update', 'projects', { id, old: oldData, new: result });
    
    return result;
  },
  
  delete: async (id: string) => {
    // 先获取数据用于日志
    const { data: oldData } = await supabase.from('projects').select('*').eq('id', id).single();
    
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) handleError(error);
    
    // 记录日志
    await logOperation('delete', 'projects', { id, data: oldData });
    
    return null;
  },
};

// ==================== 供应商 API ====================
export const suppliersApi = {
  list: async (params?: { page?: number; pageSize?: number; keyword?: string; category?: string }) => {
    let query = supabase.from('suppliers').select('*', { count: 'exact' });
    
    if (params?.keyword) {
      query = query.or(`name.ilike.%${params.keyword}%,code.ilike.%${params.keyword}%`);
    }
    if (params?.category && params.category !== 'all') {
      query = query.eq('category', params.category);
    }
    
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) handleError(error);
    
    return { data: data || [], total: count || 0, page, pageSize };
  },
  
  get: async (id: string) => {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
    if (error) handleError(error);
    return data;
  },
  
  create: async (data: any) => {
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        cleanedData[key] = null;
      } else if (key === 'rating' && value !== null && value !== undefined && value !== '') {
        cleanedData[key] = parseFloat(value as string);
      } else {
        cleanedData[key] = value;
      }
    }
    
    const insertData = {
      ...cleanedData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data: result, error } = await supabase
      .from('suppliers')
      .insert([insertData])
      .select()
      .single();
    if (error) handleError(error);
    
    await logOperation('insert', 'suppliers', { id: result.id, data: result });
    return result;
  },
  
  update: async (id: string, data: any) => {
    const { data: oldData } = await supabase.from('suppliers').select('*').eq('id', id).single();
    
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        cleanedData[key] = null;
      } else if (key === 'rating' && value !== null && value !== undefined && value !== '') {
        cleanedData[key] = parseFloat(value as string);
      } else {
        cleanedData[key] = value;
      }
    }
    
    const { data: result, error } = await supabase
      .from('suppliers')
      .update({ ...cleanedData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error);
    
    await logOperation('update', 'suppliers', { id, old: oldData, new: result });
    return result;
  },
  
  delete: async (id: string) => {
    const { data: oldData } = await supabase.from('suppliers').select('*').eq('id', id).single();
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) handleError(error);
    await logOperation('delete', 'suppliers', { id, data: oldData });
    return null;
  },
};

// ==================== 采购 API ====================
export const purchasesApi = {
  list: async (params?: any) => {
    let query = supabase.from('purchases').select('*, projects(name), suppliers(name)', { count: 'exact' });
    
    if (params?.keyword) {
      query = query.ilike('content', `%${params.keyword}%`);
    }
    if (params?.projectId && params.projectId !== 'all') {
      query = query.eq('project_id', params.projectId);
    }
    if (params?.supplierId && params.supplierId !== 'all') {
      query = query.eq('supplier_id', params.supplierId);
    }
    if (params?.status && params.status !== 'all') {
      query = query.eq('logistics_status', params.status);
    }
    
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query.range(from, to).order('purchase_date', { ascending: false });
    if (error) handleError(error);
    
    return { data: data || [], total: count || 0, page, pageSize };
  },
  
  get: async (id: string) => {
    const { data, error } = await supabase.from('purchases').select('*, projects(*), suppliers(*)').eq('id', id).single();
    if (error) handleError(error);
    return data;
  },
  
  create: async (data: any) => {
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        cleanedData[key] = null;
      } else if (key === 'amount' && value !== null && value !== undefined && value !== '') {
        cleanedData[key] = parseFloat(value as string);
      } else {
        cleanedData[key] = value;
      }
    }
    
    const insertData = {
      ...cleanedData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data: result, error } = await supabase
      .from('purchases')
      .insert([insertData])
      .select()
      .single();
    if (error) handleError(error);
    
    await logOperation('insert', 'purchases', { id: result.id, data: result });
    return result;
  },
  
  update: async (id: string, data: any) => {
    const { data: oldData } = await supabase.from('purchases').select('*').eq('id', id).single();
    
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        cleanedData[key] = null;
      } else if (key === 'amount' && value !== null && value !== undefined && value !== '') {
        cleanedData[key] = parseFloat(value as string);
      } else {
        cleanedData[key] = value;
      }
    }
    
    const { data: result, error } = await supabase
      .from('purchases')
      .update({ ...cleanedData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error);
    
    await logOperation('update', 'purchases', { id, old: oldData, new: result });
    return result;
  },
  
  delete: async (id: string) => {
    const { data: oldData } = await supabase.from('purchases').select('*').eq('id', id).single();
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) handleError(error);
    await logOperation('delete', 'purchases', { id, data: oldData });
    return null;
  },
};

// ==================== 收付款 API ====================
export const transactionsApi = {
  list: async (params?: any) => {
    let query = supabase.from('transactions').select('*, projects(name), suppliers(name)', { count: 'exact' });
    
    if (params?.keyword) {
      query = query.ilike('remark', `%${params.keyword}%`);
    }
    if (params?.type && params.type !== 'all') {
      query = query.eq('type', params.type);
    }
    
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query.range(from, to).order('date', { ascending: false });
    if (error) handleError(error);
    
    return { data: data || [], total: count || 0, page, pageSize };
  },
  
  get: async (id: string) => {
    const { data, error } = await supabase.from('transactions').select('*, projects(*), suppliers(*)').eq('id', id).single();
    if (error) handleError(error);
    return data;
  },
  
  create: async (data: any) => {
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        cleanedData[key] = null;
      } else if (key === 'amount' && value !== null && value !== undefined && value !== '') {
        cleanedData[key] = parseFloat(value as string);
      } else {
        cleanedData[key] = value;
      }
    }
    
    const insertData = {
      ...cleanedData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data: result, error } = await supabase
      .from('transactions')
      .insert([insertData])
      .select()
      .single();
    if (error) handleError(error);
    
    await logOperation('insert', 'transactions', { id: result.id, data: result });
    return result;
  },
  
  update: async (id: string, data: any) => {
    const { data: oldData } = await supabase.from('transactions').select('*').eq('id', id).single();
    
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        cleanedData[key] = null;
      } else if (key === 'amount' && value !== null && value !== undefined && value !== '') {
        cleanedData[key] = parseFloat(value as string);
      } else {
        cleanedData[key] = value;
      }
    }
    
    const { data: result, error } = await supabase
      .from('transactions')
      .update({ ...cleanedData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error);
    
    await logOperation('update', 'transactions', { id, old: oldData, new: result });
    return result;
  },
  
  delete: async (id: string) => {
    const { data: oldData } = await supabase.from('transactions').select('*').eq('id', id).single();
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) handleError(error);
    await logOperation('delete', 'transactions', { id, data: oldData });
    return null;
  },
};

// ==================== 发票 API ====================
export const invoicesApi = {
  list: async (params?: any) => {
    let query = supabase.from('invoices').select('*, projects(name), suppliers(name)', { count: 'exact' });
    
    if (params?.keyword) {
      query = query.ilike('invoice_no', `%${params.keyword}%`);
    }
    if (params?.type && params.type !== 'all') {
      query = query.eq('type', params.type);
    }
    if (params?.projectId && params.projectId !== 'all') {
      query = query.eq('project_id', params.projectId);
    }
    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }
    
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query.range(from, to).order('invoice_date', { ascending: false });
    if (error) handleError(error);
    
    return { data: data || [], total: count || 0, page, pageSize };
  },
  
  get: async (id: string) => {
    const { data, error } = await supabase.from('invoices').select('*, projects(*), suppliers(*)').eq('id', id).single();
    if (error) handleError(error);
    return data;
  },
  
  create: async (data: any) => {
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        cleanedData[key] = null;
      } else if ((key === 'amount' || key === 'tax_amount' || key === 'total_amount') && value !== null && value !== undefined && value !== '') {
        cleanedData[key] = parseFloat(value as string);
      } else {
        cleanedData[key] = value;
      }
    }
    
    const insertData = {
      ...cleanedData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data: result, error } = await supabase
      .from('invoices')
      .insert([insertData])
      .select()
      .single();
    if (error) handleError(error);
    
    await logOperation('insert', 'invoices', { id: result.id, data: result });
    return result;
  },
  
  update: async (id: string, data: any) => {
    const { data: oldData } = await supabase.from('invoices').select('*').eq('id', id).single();
    
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        cleanedData[key] = null;
      } else if ((key === 'amount' || key === 'tax_amount' || key === 'total_amount') && value !== null && value !== undefined && value !== '') {
        cleanedData[key] = parseFloat(value as string);
      } else {
        cleanedData[key] = value;
      }
    }
    
    const { data: result, error } = await supabase
      .from('invoices')
      .update({ ...cleanedData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error);
    
    await logOperation('update', 'invoices', { id, old: oldData, new: result });
    return result;
  },
  
  delete: async (id: string) => {
    const { data: oldData } = await supabase.from('invoices').select('*').eq('id', id).single();
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) handleError(error);
    await logOperation('delete', 'invoices', { id, data: oldData });
    return null;
  },
};

// ==================== 仪表盘 API ====================
export const dashboardApi = {
  getStats: async () => {
    // 项目总数
    const { count: totalProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    
    // 在途项目金额
    const { data: ongoingProjects } = await supabase.from('projects').select('contract_amount').eq('status', 'ongoing');
    const ongoingAmount = ongoingProjects?.reduce((sum, p) => sum + (parseFloat(p.contract_amount) || 0), 0) || 0;
    
    // 采购总额
    const { data: purchases } = await supabase.from('purchases').select('amount');
    const totalPurchase = purchases?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
    
    // 已付款总额
    const { data: payments } = await supabase.from('transactions').select('amount').eq('type', 'payment');
    const totalPaid = payments?.reduce((sum, p) => sum + Math.abs(parseFloat(p.amount) || 0), 0) || 0;
    
    // 已收款总额
    const { data: receipts } = await supabase.from('transactions').select('amount').eq('type', 'receipt');
    const totalReceipt = receipts?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
    
    return {
      totalProjects: totalProjects || 0,
      ongoingAmount,
      unpaidAmount: totalPurchase - totalPaid,
      unpaidInvoiceAmount: totalReceipt,
    };
  },
};

// ==================== 导出 API ====================
export const exportApi = {
  toFeishu: async (dataType: string) => {
    console.log('导出到飞书:', dataType);
    await logOperation('export', dataType, { target: 'feishu' });
    return { success: true, message: '导出功能开发中' };
  },
  exportData: async (module: string, params?: any) => {
    console.log('导出数据:', module, params);
    await logOperation('export', module, { params });
    return { success: true, message: '导出功能开发中' };
  },
};

// ==================== 统一导出 ====================
export const api = {
  auth: authApi,
  projects: projectsApi,
  suppliers: suppliersApi,
  purchases: purchasesApi,
  transactions: transactionsApi,
  invoices: invoicesApi,
  dashboard: dashboardApi,
  export: exportApi,
};