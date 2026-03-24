import { requireAuth } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../utils/response';

export async function GET(request: Request) {
  try {
    const user = requireAuth(request);
    return successResponse(user);
  } catch (error: any) {
    return errorResponse(error.message, 401);
  }
}