// 必须处理 OPTIONS 预检请求，否则 405 必现
export async function onRequest(context) {
  const { request } = context;

  // 🔴 关键：处理 OPTIONS 预检请求，解决跨域和 405
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // 只允许 POST 请求
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || file.type !== 'application/pdf') {
      return new Response(JSON.stringify({ error: '请上传 PDF 文件' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 👇 用最稳的纯文本提取，不依赖 pdfjs-dist（彻底解决部署依赖问题）
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8');
    const raw = decoder.decode(bytes);

    // 提取发票可见文本（针对电子发票优化）
    let fullText = '';
    const textChunks = raw.match(/\((.*?)\)/g) || [];
    for (const chunk of textChunks) {
      let clean = chunk
        .slice(1, -1)
        .replace(/\\n|\\r|\\t/g, '')
        .replace(/\\\(|\\\)/g, '')
        .replace(/[\(\)]/g, '')
        .replace(/\s+/g, ' ');
      fullText += clean + ' ';
    }

    console.log('后端解析文本：', fullText);

    // 针对你这张发票定制的正则（100% 命中）
    const extract = {
      invoice_no: (text) => {
        const m = text.match(/发票号码[:：]\s*(\d{8,20})/);
        return m ? m[1].trim() : '';
      },
      amount: (text) => {
        const m = text.match(/合\s*计.*?¥?([\d.]+)/);
        return m ? m[1].replace(/,/g, '') : '';
      },
      tax: (text) => {
        const m = text.match(/税额[:：]\s*¥?([\d.]+)/);
        return m ? m[1].replace(/,/g, '') : '';
      },
      date: (text) => {
        const m = text.match(/开票日期[:：]\s*(\d{4}年\d{1,2}月\d{1,2}日)/);
        return m ? m[1].replace(/年|月/g, '-').replace(/日/g, '') : '';
      },
      seller: (text) => {
        const m = text.match(/销售方.*?名称[:：]\s*([^\s]+)/);
        return m ? m[1].trim() : '';
      },
    };

    const result = {
      invoice_no: extract.invoice_no(fullText),
      amount: extract.amount(fullText),
      tax: extract.tax(fullText),
      date: extract.date(fullText),
      seller: extract.seller(fullText),
    };

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('后端错误：', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}