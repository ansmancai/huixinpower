import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tables = ['projects', 'suppliers', 'purchases', 'invoices', 'transactions'];

async function backup() {
  console.log('开始备份...', new Date().toLocaleString());
  
  const workbook = XLSX.utils.book_new();
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    
    console.log(`${table}: ${data.length} 条记录`);
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, table);
  }
  
  const fileName = `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  console.log(`备份完成：${fileName}`);
}

backup().catch(console.error);