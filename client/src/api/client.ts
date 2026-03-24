import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';

// ==================== Supabase 客户端 ====================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('缺少 Supabase 环境变量，请检查 .env 或 EdgeOne 环境变量配置');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==================== 辅助函数 ====================
function handleError(error: any) {
  console.error('API Error:', error);
  throw new Error(error.message || '操作失败');
}

// ==================== 认证 API ====================
export const authApi = {
  login: async (email: string, password: string) => {
    // 先查用户表（因为密码是 bcrypt 哈希，Supabase Auth 暂不用）
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      throw new Error('用户不存在');
    }
    
    // 简单密码验证（开发阶段，实际应用应使用 bcrypt 比较）
    // 这里简化处理：密码为 'admin123' 或 '123456' 即可登录
    if (password !== 'admin123' && password !== '123456') {
      throw new Error('密码错误');
    }
    
    const token = btoa(JSON.stringify({ id: data.id, email: data.email }));
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
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    if (error) handleError(error);
    return data?.[0] || null;
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
    const { data: result, error } = await supabase
      .from('projects')
      .insert([{ ...data, id: crypto.randomUUID(), created_at: new Date() }])
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  update: async (id: string, data: any) => {
    const { data: result, error } = await supabase
      .from('projects')
      .update({ ...data, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  delete: async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) handleError(error);
    return null;
  },
};

// ==================== 供应商管理 API ====================
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
    const { data: result, error } = await supabase
      .from('suppliers')
      .insert([{ ...data, id: crypto.randomUUID(), created_at: new Date() }])
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  update: async (id: string, data: any) => {
    const { data: result, error } = await supabase
      .from('suppliers')
      .update({ ...data, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  delete: async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) handleError(error);
    return null;
  },
};

// ==================== 采购管理 API ====================
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
    const { data: result, error } = await supabase
      .from('purchases')
      .insert([{ ...data, id: crypto.randomUUID(), created_at: new Date() }])
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  update: async (id: string, data: any) => {
    const { data: result, error } = await supabase
      .from('purchases')
      .update({ ...data, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  delete: async (id: string) => {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) handleError(error);
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
    if (params?.projectId && params.projectId !== 'all') {
      query = query.eq('project_id', params.projectId);
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
    const { data: result, error } = await supabase
      .from('transactions')
      .insert([{ ...data, id: crypto.randomUUID(), created_at: new Date() }])
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  update: async (id: string, data: any) => {
    const { data: result, error } = await supabase
      .from('transactions')
      .update({ ...data, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  delete: async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) handleError(error);
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
    const { data: result, error } = await supabase
      .from('invoices')
      .insert([{ ...data, id: crypto.randomUUID(), created_at: new Date() }])
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  update: async (id: string, data: any) => {
    const { data: result, error } = await supabase
      .from('invoices')
      .update({ ...data, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error);
    return result;
  },
  
  delete: async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) handleError(error);
    return null;
  },
};

// ==================== 统一导出（兼容旧代码）====================
export const api = {
  auth: authApi,
  projects: projectsApi,
  suppliers: suppliersApi,
  purchases: purchasesApi,
  transactions: transactionsApi,
  invoices: invoicesApi,
  dashboard: {
    getStats: async () => {
      // 简化版，后续完善
      return { totalProjects: 0, ongoingAmount: 0, unpaidAmount: 0, unpaidInvoiceAmount: 0 };
    },
  },
  export: {
    toFeishu: async (dataType: string) => {
      console.log('导出到飞书:', dataType);
      return { success: true, message: '导出功能开发中' };
    },
    exportData: async (module: string, params?: any) => {
      console.log('导出数据:', module, params);
      return { success: true, message: '导出功能开发中' };
    },
  },
};