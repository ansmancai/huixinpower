import { db } from '../../db';
import { transactions } from '../../db/schema';
import { requireAuth, checkPermission } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../utils/response';
import { eq } from 'drizzle-orm';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    requireAuth(request);
    const result = await db.select().from(transactions).where(eq(transactions.id, params.id));
    if (!result.length) {
      return errorResponse('交易记录不存在', 404);
    }
    return successResponse(result[0]);
  } catch (error: any) {
    return errorResponse(error.message, 401);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(request);
    if (!checkPermission(user, 'finance')) {
      return errorResponse('权限不足，需要财务或管理员权限', 403);
    }

    const body = await request.json();
    await db
      .update(transactions)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(transactions.id, params.id));

    const updated = await db.select().from(transactions).where(eq(transactions.id, params.id));
    if (!updated.length) {
      return errorResponse('交易记录不存在', 404);
    }
    return successResponse(updated[0], '交易记录更新成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(request);
    if (!checkPermission(user, 'admin')) {
      return errorResponse('权限不足，仅管理员可删除', 403);
    }

    await db.delete(transactions).where(eq(transactions.id, params.id));
    return successResponse(null, '交易记录删除成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}