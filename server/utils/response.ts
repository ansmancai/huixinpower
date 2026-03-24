export function successResponse<T>(data: T, message?: string) {
  return Response.json(
    {
      success: true,
      data,
      message: message || '操作成功',
    },
    { status: 200 }
  );
}

export function errorResponse(message: string, status: number = 400) {
  return Response.json(
    {
      success: false,
      message,
    },
    { status }
  );
}