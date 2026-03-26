import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态导入 pdf-parse
const pdfParse = await import('pdf-parse');

const pdfPath = path.join(__dirname, '你的发票.pdf');
const buffer = fs.readFileSync(pdfPath);

pdfParse.default(buffer).then(data => {
  console.log('=== PDF 内容 ===');
  console.log(data.text);
}).catch(err => {
  console.error('解析失败:', err);
});