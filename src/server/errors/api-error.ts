import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import crypto from 'crypto';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EXPIRED'
  | 'REVOKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AI_SERVICE_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export interface ErrorDetail {
  field?: string;
  code: string;
  message?: string;
}

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, message: string, statusCode: number, details?: ErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message: string, details?: ErrorDetail[]) {
    return new ApiError('VALIDATION_ERROR', message, 400, details);
  }

  static unauthorized(message = 'Authentication required.') {
    return new ApiError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'You do not have permission to access this resource.') {
    return new ApiError('FORBIDDEN', message, 403);
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError('NOT_FOUND', message, 404);
  }

  static conflict(message: string, details?: ErrorDetail[]) {
    return new ApiError('CONFLICT', message, 409, details);
  }

  static expired(message = 'Share link has expired.') {
    return new ApiError('EXPIRED', message, 410);
  }

  static revoked(message = 'Share link has been revoked.') {
    return new ApiError('REVOKED', message, 403);
  }

  static rateLimit(message = 'Rate limit exceeded. Please try again later.') {
    return new ApiError('RATE_LIMIT_EXCEEDED', message, 429);
  }

  static aiError(message: string, details?: ErrorDetail[]) {
    return new ApiError('AI_SERVICE_ERROR', message, 502, details);
  }

  static internal(message = 'An unexpected internal error occurred.') {
    return new ApiError('INTERNAL_SERVER_ERROR', message, 500);
  }
}

export function formatErrorResponse(err: unknown, reqId?: string): NextResponse {
  // Let Next.js internal dynamic server bail errors bubble up
  if ((err as any)?.digest === 'DYNAMIC_SERVER_USAGE' || (err as any)?.name === 'DynamicServerError') {
    throw err;
  }

  const requestId = reqId || `req_${crypto.randomBytes(8).toString('hex')}`;

  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details && err.details.length > 0 ? { details: err.details } : {}),
          requestId,
        },
      },
      { status: err.statusCode }
    );
  }

  if (err instanceof ZodError) {
    const details: ErrorDetail[] = err.issues.map((e) => ({
      field: e.path.join('.'),
      code: e.code,
      message: e.message,
    }));
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The request contains invalid fields.',
          details,
          requestId,
        },
      },
      { status: 400 }
    );
  }

  // Generic fallback without exposing internal stack trace or DB errors
  console.error(`[${requestId}] Internal error:`, err);
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal error occurred. Please try again later.',
        requestId,
      },
    },
    { status: 500 }
  );
}
