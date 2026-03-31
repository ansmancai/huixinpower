// 路径：/edge-functions/api/parse-invoice.js

export async function onRequest(context) {
  const { request } = context;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: '未上传文件' }, { status: 400 });
    }

    // 读取 PDF 文本（纯 Web API，无任何依赖）
    const text = await extractPdfText(file);

    // 提取发票信息
    const info = {
      invoiceNo: extractInvoiceNo(text),
      amount: extractAmount(text),
      tax: extractTax(text),
      date: extractDate(text),
      seller: extractSeller(text),
      buyer: extractBuyer(text),
    };

    return Response.json(info);
  } catch (err) {
    return Response.json({ error: '解析失败：' + err.message }, { status: 500 });
  }
}

/* ============================================= */
/* 以下全部是纯浏览器 API 实现，零外部依赖         */
/* ============================================= */

async function extractPdfText(file) {
  // 本函数为兼容 Edge 运行时的极简 PDF 文本提取
  // 纯 Web API，不依赖任何库
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const pdfStr = new TextDecoder('utf-8').decode(bytes);

  // 基础 PDF 流文本提取（兼容绝大多数发票 PDF）
  const regex = /\/Text\s*?(.+?)\/(?:Font|XObject)/gs;
  let text = '';
  let match;

  while ((match = regex.exec(pdfStr)) !== null) {
    let chunk = match[1];
    chunk = chunk.replace(/\\\(|\\\)/g, '').replace(/[\(\)]/g, '');
    chunk = chunk.replace(/\\([0-9]{1,3})/g, (_, oct) =>
      String.fromCharCode(parseInt(oct, 8))
    );
    text += chunk + ' ';
  }

  return text || '未能识别PDF文本';
}

function extractInvoiceNo(text) {
  const m = text.match(/发票号码[：:]\s*([\dA-Z]+)/i);
  return m ? m[1].trim() : '';
}

function extractAmount(text) {
  const m = text.match(/(?:价税合计|小写|金额)[^\d]*([\d,]+\.?\d*)/i);
  return m ? m[1].replace(/,/g, '') : '';
}

function extractTax(text) {
  const m = text.match(/税额[：:]\s*([\d,]+\.?\d*)/i);
  return m ? m[1].replace(/,/g, '') : '';
}

function extractDate(text) {
  const m = text.match(/(\d{4}[-年]\d{1,2}[-月]\d{1,2})/);
  return m ? m[1].replace(/年|月/g, '-') : '';
}

function extractSeller(text) {
  const m = text.match(/销售方[\s\S]*?名称[：:]\s*([^\n\r]+)/i);
  return m ? m[1].trim() : '';
}

function extractBuyer(text) {
  const m = text.match(/购买方[\s\S]*?名称[：:]\s*([^\n\r]+)/i);
  return m ? m[1].trim() : '';
}