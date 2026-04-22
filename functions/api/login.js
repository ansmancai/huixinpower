export async function onRequestPost({ request }) {
  try {
    const { email, password } = await request.json();
    
    // 临时硬编码验证（测试用）
    if (email === 'admin@example.com' && password === 'admin123') {
      const token = btoa(JSON.stringify({ email, role: 'admin' }));
      return new Response(JSON.stringify({
        success: true,
        data: { 
          token, 
          user: { id: '1', email, name: '管理员', role: 'admin' } 
        }
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: '用户名或密码错误' 
    }), { status: 401 });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500 });
  }
}