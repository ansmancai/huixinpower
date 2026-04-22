// 简单的 JWT 生成（使用 Web Crypto API）
async function generateToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${signatureInput}.${encodedSignature}`;
}

export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '邮箱和密码不能为空' 
      }), { status: 400 });
    }
    
    // 查询 Supabase 用户表
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const users = await response.json();
    const user = users?.[0];
    
    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '用户不存在' 
      }), { status: 401 });
    }
    
    // 验证密码（明文比对）
    if (password !== user.password_hash) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '密码错误' 
      }), { status: 401 });
    }
    
    // 生成 token
    const payload = { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role 
    };
    const token = await generateToken(payload, env.JWT_SECRET);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        }
      }
    }), { headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500 });
  }
}