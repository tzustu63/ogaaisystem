import { Response } from 'express';

/**
 * 標準化 API 響應格式
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * 發送成功響應
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (message) response.message = message;
  if (meta) response.meta = meta;

  return res.status(statusCode).json(response);
};

/**
 * 發送建立成功響應 (201)
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = '建立成功'
): Response => {
  return sendSuccess(res, data, message, 201);
};

/**
 * 發送無內容響應 (204)
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * 發送分頁響應
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): Response => {
  return sendSuccess(res, data, undefined, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

/**
 * 發送訊息響應
 */
export const sendMessage = (
  res: Response,
  message: string,
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
  });
};
