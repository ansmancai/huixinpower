import { db } from '../../db';
import { transactions } from '../../db/schema';
import { requireAuth, checkPermission } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../utils/response';
import { generateId } from '../../utils/id';
import { desc, eq, sql, and, between } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    requireAuth(request);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const projectId = url.searchParams.get('projectId');
    const type = url.searchParams.get('type');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let conditions: any[] = [];
    if (projectId) {
      conditions.push(eq(transactions.projectId, projectId));
    }
    if (type && type !== 'all') {
      conditions.push(eq(transactions.type, type as any));
    }
    if (startDate && endDate) {
      conditions.push(between(transactions.transactionDate, new Date(startDate), new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereClause);
    const total = totalResult[0].count;

    let query = db.select().from(transactions);
    if (whereClause) {
      query = query.where(whereClause);
    }
    const data = await query
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(desc(transactions.transactionDate));

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

    await db.insert(transactions).values({
      id,
      ...body,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newTransaction = await db.select().from(transactions).where(eq(transactions.id, id));
    return successResponse(newTransaction[0], '交易记录创建成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}