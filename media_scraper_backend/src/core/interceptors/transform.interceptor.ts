import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    size?: number;
    [key: string]: any;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        if (data && typeof data === 'object' && 'data' in data && 'total' in data) {
          const { data: resultData, total, ...meta } = data;
          return {
            statusCode,
            message: 'Success',
            data: resultData,
            meta: {
              total,
              ...meta,
            },
          };
        }

        if (Array.isArray(data)) {
          return {
            statusCode,
            message: 'Success',
            data,
            meta: {
              total: data.length,
            },
          };
        }

        return {
          statusCode,
          message: 'Success',
          data,
        };
      }),
    );
  }
}
