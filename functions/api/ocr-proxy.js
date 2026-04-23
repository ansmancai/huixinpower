export async function onRequestPost({ request, env }) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return new Response(JSON.stringify({ error_code: -1, error_msg: '没有图片' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // 临时硬编码密钥（直接测试）
    const clientId = 'rP5wKOeE8JVovlx8J7E2S8wv';
    const clientSecret = 'Hf5wWfnJAZHXy6UjkVWKWPWNLUh9pBSu';
    
    // 获取百度 access_token
    const tokenRes = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    });
    
    const tokenData = await tokenRes.json();
    
    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ 
        error_code: -1, 
        error_msg: '获取token失败', 
        detail: tokenData 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // 调用百度增值税发票识别 API
    const ocrRes = await fetch(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice?access_token=${tokenData.access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
        body: `image=${image}`
      }
    );
    
    const data = await ocrRes.json();
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error_code: -1, error_msg: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}