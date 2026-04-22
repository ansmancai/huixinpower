import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
    
    // 验证密码（bcrypt 比对）
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '密码错误' 
      }), { status: 401 });
    }
    
    // 生成 JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
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