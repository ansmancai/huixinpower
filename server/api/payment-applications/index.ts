import { db } from '../../db';
import { paymentApplications } from '../../db/schema';
import { requireAuth, checkPermission } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../utils/response';
import { generateId } from '../../utils/id';
import { desc, eq, sql, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    requireAuth(request);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const projectId = url.searchParams.get('projectId');
    const status = url.searchParams.get('status');

    let conditions: any[] = [];
    if (projectId) {
      conditions.push(eq(paymentApplications.projectId, projectId));
    }
    if (status && status !== 'all') {
      conditions.push(eq(paymentApplications.status, status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(paymentApplications)
      .where(whereClause);
    const total = totalResult[0].count;

    let query = db.select().from(paymentApplications);
    if (whereClause) {
      query = query.where(whereClause);
    }
    const data = await query
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(desc(paymentApplications.createdAt));

    return successResponse({ data, total, page, pageSize });
  } catch (error: any) {
    return errorResponse(error.message, 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = requireAuth(request);
    if (!checkPermission(user, 'finance')) {
      return errorResponse('权限不足，需要财务或管理员权限', 403);
    }

    const body = await request.json();
    const id = generateId();

    await db.insert(paymentApplications).values({
      id,
      ...body,
      status: 'pending',
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newApplication = await db.select().from(paymentApplications).where(eq(paymentApplications.id, id));
    return successResponse(newApplication[0], '付款申请创建成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}