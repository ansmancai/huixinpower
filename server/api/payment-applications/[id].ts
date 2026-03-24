import { db } from '../../db';
import { paymentApplications } from '../../db/schema';
import { users } from '../../db/schema';
import { requireAuth, checkPermission } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../utils/response';
import { eq } from 'drizzle-orm';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    requireAuth(request);
    const result = await db.select().from(paymentApplications).where(eq(paymentApplications.id, params.id));
    if (!result.length) {
      return errorResponse('付款申请不存在', 404);
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
      .update(paymentApplications)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(paymentApplications.id, params.id));

    const updated = await db.select().from(paymentApplications).where(eq(paymentApplications.id, params.id));
    if (!updated.length) {
      return errorResponse('付款申请不存在', 404);
    }
    return successResponse(updated[0], '付款申请更新成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

// 审批专用接口
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(request);
    if (!checkPermission(user, 'finance')) {
      return errorResponse('权限不足，需要财务或管理员权限', 403);
    }

    const { status } = await request.json();
    if (!['approved', 'rejected', 'paid'].includes(status)) {
      return errorResponse('无效的审批状态');
    }

    await db
      .update(paymentApplications)
      .set({
        status,
        approvedBy: user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentApplications.id, params.id));

    const updated = await db.select().from(paymentApplications).where(eq(paymentApplications.id, params.id));
    return successResponse(updated[0], `付款申请已${status === 'approved' ? '通过' : status === 'rejected' ? '驳回' : '付款'}`);
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

    await db.delete(paymentApplications).where(eq(paymentApplications.id, params.id));
    return successResponse(null, '付款申请删除成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}