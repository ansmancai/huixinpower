import pdf from 'pdf-parse';

export async function onRequest(context) {
  const { request } = context;
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: '没有文件' }), { status: 400 });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    const text = data.text;
    
    const info = {
      invoice_no: extractInvoiceNo(text),
      amount: extractAmount(text),
      tax: extractTax(text),
      date: extractDate(text),
      seller: extractSeller(text),
      buyer: extractBuyer(text),
    };
    
    return new Response(JSON.stringify(info), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

function extractInvoiceNo(text) {
  const match = text.match(/发票号码[：:]\s*(\d+)/);
  return match ? match[1] : '';
}

function extractAmount(text) {
  const match = text.match(/金额[（(]小写[）)]|[：:]\s*([\d,]+\.?\d*)/);
  if (match && match[1]) return match[1].replace(/,/g, '');
  const match2 = text.match(/(\d+\.?\d{2})(?=\s*元)/);
  return match2 ? match2[1] : '';
}

function extractTax(text) {
  const match = text.match(/税额[：:]\s*([\d,]+\.?\d*)/);
  return match ? match[1].replace(/,/g, '') : '';
}

function extractDate(text) {
  const match = text.match(/开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)/);
  if (match) {
    return match[1].replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '');
  }
  const match2 = text.match(/(\d{4}-\d{2}-\d{2})/);
  return match2 ? match2[1] : '';
}

function extractSeller(text) {
  const match = text.match(/销售方[：:][\s\S]*?名称[：:]\s*([^\n\r]+)/);
  return match ? match[1].trim() : '';
}

function extractBuyer(text) {
  const match = text.match(/购买方[：:][\s\S]*?名称[：:]\s*([^\n\r]+)/);
  return match ? match[1].trim() : '';
}