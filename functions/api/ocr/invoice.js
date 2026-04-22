export async function onRequestPost({ request, env }) {
  try {
    // 1. 获取上传的文件
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '没有上传文件' 
      }), { status: 400 });
    }
    
    // 2. 检查文件类型
    if (file.type !== 'application/pdf') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '只支持 PDF 文件' 
      }), { status: 400 });
    }
    
    // 3. 将 PDF 转为 Base64（百度 OCR 需要图片）
    // 注意：这里需要先将 PDF 转图片，由于 EdgeOne Functions 环境限制，
    // 我们先用模拟数据测试，后续再完善
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // 4. 获取百度 access_token
    const tokenRes = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: env.BAIDU_API_KEY,
        client_secret: env.BAIDU_SECRET_KEY
      })
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '获取百度 token 失败' 
      }), { status: 500 });
    }
    
    // 5. 调用百度发票识别 API
    // 注意：百度 OCR 需要图片，我们需要先把 PDF 转成图片
    // 由于 EdgeOne Functions 环境限制，这一步暂时用模拟返回
    // 后续可以用 pdf.js 或调用外部转换服务
    
    // 模拟返回结果（测试用）
    const mockResult = {
      success: true,
      data: {
        invoiceNo: '123456789012345678',
        amount: '1000.00',
        date: '2024-01-01',
        sellerName: '测试销售方',
        buyerName: '测试购买方',
        tax: '130.00',
        total: '1130.00'
      }
    };
    
    return new Response(JSON.stringify(mockResult), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    // 真实调用百度 API 的代码（待完善）
    /*
    const ocrRes = await fetch(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice?access_token=${tokenData.access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `image=${base64}`
      }
    );
    const ocrData = await ocrRes.json();
    
    if (ocrData.error_code) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: ocrData.error_msg 
      }), { status: 500 });
    }
    
    const words = ocrData.words_result || {};
    return new Response(JSON.stringify({
      success: true,
      data: {
        invoiceNo: words.InvoiceNum?.words || '',
        amount: words.AmountInFiguers?.words || '',
        date: words.InvoiceDate?.words || '',
        sellerName: words.SellerName?.words || '',
        buyerName: words.BuyerName?.words || '',
        tax: words.Tax?.words || '',
        total: words.AmountInWords?.words || ''
      }
    }), { headers: { 'Content-Type': 'application/json' } });
    */
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500 });
  }
}