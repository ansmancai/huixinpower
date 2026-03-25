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
    let totalCount = 0;
    
    for (const table of TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(`导出 ${table} 失败:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        totalCount += data.length;
        const formattedData = data.map(row => {
          const newRow: any = {};
          for (const [key, value] of Object.entries(row)) {
            if (value instanceof Date) {
              newRow[key] = value.toLocaleString();
            } else if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
              newRow[key] = new Date(value).toLocaleString();
            } else {
              newRow[key] = value;
            }
          }
          return newRow;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        if (formattedData.length > 0) {
          const cols = Object.keys(formattedData[0]).map(key => ({ wch: Math.min(key.length + 2, 30) }));
          worksheet['!cols'] = cols;
        }
        XLSX.utils.book_append_sheet(workbook, worksheet, TABLE_NAMES_CN[table]);
      } else {
        const worksheet = XLSX.utils.aoa_to_sheet([[`暂无${TABLE_NAMES_CN[table]}数据`]]);
        XLSX.utils.book_append_sheet(workbook, worksheet, TABLE_NAMES_CN[table]);
      }
    }
    
    const now = new Date();
    const filename = `电力财务系统备份_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    // 记录日志
    await logOperation('backup', 'all', { tables: TABLES, count: totalCount });
    
    return { success: true, message: '备份成功' };
  } catch (error: any) {
    console.error('备份失败:', error);
    return { success: false, message: error.message || '备份失败' };
  }
}

// 导出单个模块数据
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
    
    const formattedData = (data || []).map(row => {
      const newRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (value instanceof Date) {
          newRow[key] = value.toLocaleString();
        } else if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
          newRow[key] = new Date(value).toLocaleString();
        } else {
          newRow[key] = value;
        }
      }
      return newRow;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, TABLE_NAMES_CN[module] || module);
    
    const finalFileName = fileName || `${TABLE_NAMES_CN[module] || module}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`;
    XLSX.writeFile(workbook, finalFileName);
    
    await logOperation('export', module, { filter, count: formattedData.length });
    
    return { success: true, message: '导出成功' };
  } catch (error: any) {
    console.error('导出失败:', error);
    return { success: false, message: error.message || '导出失败' };
  }
}