import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'finance' | 'boss' | 'viewer';
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function requireAuth(request: Request): AuthUser {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('未授权，请先登录');
  }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    throw new Error('登录已过期，请重新登录');
  }
  return user;
}

export function checkPermission(user: AuthUser, requiredRole: AuthUser['role']): boolean {
  const roleLevel: Record<AuthUser['role'], number> = {
    admin: 4,
    finance: 3,
    boss: 2,
    viewer: 1,
  };
  return roleLevel[user.role] >= roleLevel[requiredRole];
}