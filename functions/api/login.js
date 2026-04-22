// 安全的 Base64 编码
function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
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
  const signatureArray = new Uint8Array(signature);
  const base64Signature = btoa(String.fromCharCode(...signatureArray));
  const encodedSignature = base64Signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
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
    
    if (password !== user.password_hash) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '密码错误' 
      }), { status: 401 });
    }
    
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