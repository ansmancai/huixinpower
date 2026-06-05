const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tables = ['projects', 'suppliers', 'purchases', 'invoices', 'transactions'];

async function backup() {
  console.log('开始备份...', new Date().toLocaleString());
  
  // 创建一个工作簿
  const workbook = XLSX.utils.book_new();
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    
    console.log(`${table}: ${data.length} 条记录`);
    
    // 将数据转换为 Sheet
    const sheet = XLSX.utils.json_to_sheet(data);
    // 自动调整列宽（简单处理）
    XLSX.utils.book_append_sheet(workbook, sheet, table);
  }
  
  // 生成 Excel 文件
  const fileName = `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  console.log(`备份完成：${fileName}`);
}

backup().catch(console.error);