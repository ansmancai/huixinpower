export async function onRequestPost({ request, env }) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return new Response(JSON.stringify({ success: false, error: '没有图片' }), { status: 400 });
    }
    
    // 获取百度 access_token
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
    
    // 调用百度增值税发票识别 API
    const ocrRes = await fetch(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice?access_token=${tokenData.access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `image=${image}`
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
    
    // 提取关键字段
    const result = {
      success: true,
      data: {
        invoiceNo: words.InvoiceNum?.words || '',
        invoiceCode: words.InvoiceCode?.words || '',
        amount: words.AmountInFiguers?.words || '',
        amountInWords: words.AmountInWords?.words || '',
        tax: words.Tax?.words || '',
        total: words.TotalAmountInFiguers?.words || '',
        date: words.InvoiceDate?.words || '',
        sellerName: words.SellerName?.words || '',
        sellerTaxNo: words.SellerTaxNum?.words || '',
        buyerName: words.BuyerName?.words || '',
        buyerTaxNo: words.BuyerTaxNum?.words || '',
        checkCode: words.CheckCode?.words || '',
      }
    };
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500 });
  }
}