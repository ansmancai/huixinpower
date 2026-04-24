export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    
    // 从环境变量读取百度 API 密钥
    const clientId = env.BAIDU_API_KEY;
    const clientSecret = env.BAIDU_SECRET_KEY;
    
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error_code: -1, error_msg: '百度API密钥未配置' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // 获取百度 access_token 的函数
    const getAccessToken = async () => {
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
        throw new Error('获取token失败');
      }
      return tokenData.access_token;
    };
    
    // 原有发票识别逻辑
    if (body.pdf) {
      const { pdf } = body;
      const accessToken = await getAccessToken();
      
      const ocrRes = await fetch(
        `https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice?access_token=${accessToken}`,
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
    
    // 付款截图识别
    if (body.image) {
      const { image } = body;
      const accessToken = await getAccessToken();
      
      const ocrRes = await fetch(
        `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${accessToken}`,
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