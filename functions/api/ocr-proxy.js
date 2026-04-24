export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    
    // 原有发票识别逻辑（保留，完全不变）
    if (body.pdf) {
      const { pdf } = body;
      
      const clientId = 'rP5wKOeE8JVovlx8J7E2S8wv';
      const clientSecret = 'Hf5wWfnJAZHXy6UjkVWKWPWNLUh9pBSu';
      
      const tokenRes = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret
        }).toString()
      });
      
      const tokenData = await tokenRes.json();
      
      if (!tokenData.access_token) {
        return new Response(JSON.stringify({ error_code: -1, error_msg: '获取token失败', detail: tokenData }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      
      const ocrRes = await fetch(
        `https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice?access_token=${tokenData.access_token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `pdf_file=${encodeURIComponent(pdf)}`
        }
      );
      
      const data = await ocrRes.json();
      
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // 新增：付款截图识别（不影响原有逻辑）
    if (body.image) {
      const { image } = body;
      
      const clientId = 'rP5wKOeE8JVovlx8J7E2S8wv';
      const clientSecret = 'Hf5wWfnJAZHXy6UjkVWKWPWNLUh9pBSu';
      
      const tokenRes = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret
        }).toString()
      });
      
      const tokenData = await tokenRes.json();
      
      if (!tokenData.access_token) {
        return new Response(JSON.stringify({ error_code: -1, error_msg: '获取token失败', detail: tokenData }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      
      // 通用文字识别（高精度版）
      const ocrRes = await fetch(
        `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${tokenData.access_token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `image=${encodeURIComponent(image)}`
        }
      );
      
      const data = await ocrRes.json();
      
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // 既没有 pdf 也没有 image
    return new Response(JSON.stringify({ error_code: -1, error_msg: '请提供 pdf 或 image 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error_code: -1, error_msg: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}