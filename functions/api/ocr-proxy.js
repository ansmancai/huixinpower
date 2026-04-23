// 临时硬编码（测试用，部署后删除）
const BAIDU_API_KEY = 'rP5wKOeE8JVovlx8J7E2S8wv';
const BAIDU_SECRET_KEY = 'Hf5wWfnJAZHXy6UjkVWKWPWNLUh9pBSu';

export async function onRequestPost({ request }) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return new Response(JSON.stringify({ error_code: -1, error_msg: '没有图片' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // 获取百度 access_token
    const tokenRes = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: BAIDU_API_KEY,
        client_secret: BAIDU_SECRET_KEY
      })
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ error_code: -1, error_msg: '获取token失败' }), {
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