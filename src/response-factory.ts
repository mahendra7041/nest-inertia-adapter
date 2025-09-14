import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { AlwaysProp, DeferProp, MergeProp, OptionalProp } from "./props.js";
import { INERTIA_CONFIG } from "./define_config.js";
import type { MaybePromise, ResolvedConfig } from "./types.js";
import { Response } from "./response.js";
import { ClsService } from "./cls.service.js";

@Injectable()
export class ResponseFactory {
  private shouldClearHistory: boolean;
  private shouldEncryptHistory: boolean;

  constructor(
    @Inject(INERTIA_CONFIG) private readonly config: ResolvedConfig,
    private readonly clsService: ClsService
  ) {
    this.shouldClearHistory = false;
    this.shouldEncryptHistory = this.config.history.encrypt;
  }

  share(key: string, value: any) {
    const sharedProps = this.getShared();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.clsService.set("sharedProps", { ...sharedProps, [key]: value });
  }

  getShared() {
    return this.clsService.get<Record<string, any>>("sharedProps");
  }

  flushShared(): void {
    this.clsService.set("sharedProps", {});
  }

  clearHistory() {
    this.shouldClearHistory = true;
  }

  encryptHistory(encrypt: boolean = true) {
    this.shouldEncryptHistory = encrypt;
  }

  lazy<T>(callback: () => MaybePromise<T>) {
    return new OptionalProp(callback);
  }

  optional<T>(callback: () => MaybePromise<T>) {
    return new OptionalProp(callback);
  }

  defer<T>(callback: () => MaybePromise<T>, group = "default") {
    return new DeferProp(callback, group);
  }

  merge<T>(callback: () => MaybePromise<T>) {
    return new MergeProp(callback);
  }

  always<T>(callback: () => MaybePromise<T>) {
    return new AlwaysProp(callback);
  }

  render(component: string, props: Record<string, any> = {}) {
    return new Response({
      component,
      props: { ...this.getShared(), ...props },
      rootView: this.config.rootView,
      version: this.config.assetsVersion,
      clearHistory: this.shouldClearHistory,
      encryptHistory: this.shouldEncryptHistory,
    });
  }

  location(url: string) {
    return {
      statusCode: HttpStatus.CONFLICT,
      url,
    };
  }
}
