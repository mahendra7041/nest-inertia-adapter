// cls.service.ts
import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";

interface Store {
  requestId: string;
  [key: string]: any;
}

@Injectable()
export class ClsService {
  private readonly als = new AsyncLocalStorage<Store>();

  run(store: Store, callback: () => void) {
    this.als.run(store, callback);
  }

  get<T = any>(key: string): T | undefined {
    return this.als.getStore()?.[key];
  }

  set<T = any>(key: string, value: T) {
    this.als.getStore()![key] = value;
  }
}
