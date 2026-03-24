import { db } from '../../db';
import { purchases } from '../../db/schema';
import { requireAuth, checkPermission } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../utils/response';
import { eq } from 'drizzle-orm';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    requireAuth(request);
    const result = await db.select().from(purchases).where(eq(purchases.id, params.id));
    if (!result.length) {
      return errorResponse('采购单不存在', 404);
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
      .update(purchases)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(purchases.id, params.id));

    const updated = await db.select().from(purchases).where(eq(purchases.id, params.id));
    if (!updated.length) {
      return errorResponse('采购单不存在', 404);
    }
    return successResponse(updated[0], '采购单更新成功');
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

    await db.delete(purchases).where(eq(purchases.id, params.id));
    return successResponse(null, '采购单删除成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}