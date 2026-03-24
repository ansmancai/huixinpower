import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '../../utils/response';
import { generateId } from '../../utils/id';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return errorResponse('请填写完整信息');
    }

    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length) {
      return errorResponse('邮箱已注册');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = generateId();

    await db.insert(users).values({
      id,
      email,
      name,
      passwordHash,
      role: role || 'viewer',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return successResponse({ id, email, name, role: role || 'viewer' }, '注册成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}