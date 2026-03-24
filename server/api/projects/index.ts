import { db } from '../../db';
import { projects } from '../../db/schema';
import { requireAuth, checkPermission } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../utils/response';
import { generateId } from '../../utils/id';
import { like, desc, eq, sql, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const user = requireAuth(request);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const keyword = url.searchParams.get('keyword') || '';
    const status = url.searchParams.get('status');

    let conditions: any[] = [];
    if (keyword) {
      conditions.push(like(projects.name, `%${keyword}%`));
    }
    if (status && status !== 'all') {
      conditions.push(eq(projects.status, status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(whereClause);
    const total = totalResult[0].count;

    let query = db.select().from(projects);
    if (whereClause) {
      query = query.where(whereClause);
    }
    const data = await query
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(desc(projects.createdAt));

    return successResponse({
      data,
      total,
      page,
      pageSize,
    });
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

    await db.insert(projects).values({
      id,
      ...body,
      actualCost: body.actualCost || '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newProject = await db.select().from(projects).where(eq(projects.id, id));
    return successResponse(newProject[0], '项目创建成功');
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}