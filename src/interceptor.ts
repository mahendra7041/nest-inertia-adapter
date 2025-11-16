import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Response } from "./response.js";
import { GenericRequest, GenericResponse } from "./types.js";

@Injectable()
export class Interceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<GenericRequest>();
    const res = http.getResponse<GenericResponse>();

    return next.handle().pipe(
      map(async (data) => {
        if (data && data instanceof Response) {
          return await data.toResponse(req, res);
        }
        return data;
      })
    );
  }
}
