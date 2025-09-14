// cls.middleware.ts
import { Injectable, NestMiddleware } from "@nestjs/common";
import { v4 as uuid } from "uuid";
import { Request, Response, NextFunction } from "express";
import { ClsService } from "./cls.service.js";

@Injectable()
export class ClsMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.cls.run({ requestId: uuid() }, () => {
      next();
    });
  }
}
