import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '../../utils/response';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return errorResponse('邮箱和密码不能为空');
    }

    const userList = await db.select().from(users).where(eq(users.email, email));
    const user = userList[0];

    if (!user) {
      return errorResponse('用户不存在', 401);
    }

    if (!user.passwordHash) {
      return errorResponse('请使用飞书登录', 401);
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return errorResponse('密码错误', 401);
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return successResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    }, '登录成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}