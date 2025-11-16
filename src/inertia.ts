// inertia.ts
import { ModuleRef } from "@nestjs/core";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ResponseFactory } from "./response-factory.js";

@Injectable()
export class Inertia implements OnModuleInit {
  private static moduleRef: ModuleRef;

  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    Inertia.moduleRef = this.moduleRef;
  }

  private static get factory(): ResponseFactory {
    if (!this.moduleRef) {
      throw new Error(
        "Inertia not registered. Did you forget to import InertiaModule?"
      );
    }
    return this.moduleRef.get(ResponseFactory, { strict: false });
  }

  static render(component: string, props: Record<string, any> = {}) {
    return this.factory.render(component, props);
  }

  static share(key: string | Record<string, any>, value?: any) {
    return this.factory.share(key, value);
  }

  static getShared() {
    return this.factory.getShared();
  }

  static flushShared() {
    return this.factory.flushShared();
  }

  static clearHistory() {
    return this.factory.clearHistory();
  }

  static encryptHistory(encrypt = true) {
    return this.factory.encryptHistory(encrypt);
  }

  static lazy<T>(cb: () => T) {
    return this.factory.lazy(cb);
  }

  static optional<T>(cb: () => T) {
    return this.factory.optional(cb);
  }

  static defer<T>(cb: () => T, group = "default") {
    return this.factory.defer(cb, group);
  }

  static merge<T>(cb: () => T) {
    return this.factory.merge(cb);
  }

  static always<T>(cb: () => T) {
    return this.factory.always(cb);
  }

  static location(url: string) {
    return this.factory.location(url);
  }
}
