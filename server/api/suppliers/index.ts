import { db } from '../../db';
import { suppliers } from '../../db/schema';
import { requireAuth, checkPermission } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../utils/response';
import { generateId } from '../../utils/id';
import { like, desc, eq, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    requireAuth(request);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const keyword = url.searchParams.get('keyword') || '';

    let query = db.select().from(suppliers);
    if (keyword) {
      query = query.where(like(suppliers.name, `%${keyword}%`));
    }

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(suppliers);
    const total = totalResult[0].count;

    const data = await query
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(desc(suppliers.createdAt));

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

    await db.insert(suppliers).values({
      id,
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newSupplier = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return successResponse(newSupplier[0], '供应商创建成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}