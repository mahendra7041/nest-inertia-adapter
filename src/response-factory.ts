import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { AlwaysProp, DeferProp, MergeProp, OptionalProp } from "./props.js";
import { INERTIA_CONFIG } from "./define_config.js";
import type { MaybePromise, ResolvedConfig } from "./types.js";
import { Response } from "./response.js";
import { ServerRenderer } from "./server_renderer.js";
@Injectable()
export class ResponseFactory {
  private shouldClearHistory: boolean;
  private shouldEncryptHistory: boolean;
  private sharedData: Record<string, any>;
  private serverRenderer?: ServerRenderer;

  constructor(@Inject(INERTIA_CONFIG) private readonly config: ResolvedConfig) {
    this.shouldClearHistory = false;
    this.shouldEncryptHistory = this.config.history.encrypt;
    this.sharedData = this.config.sharedData;

    if (this.config.ssr.enabled) {
      this.serverRenderer = new ServerRenderer(this.config);
    }
  }

  share(key: string | Record<string, any>, value?: any) {
    if (typeof key === "object" && key !== null) {
      this.sharedData = { ...this.sharedData, ...key };
    } else if (typeof key === "string" && value !== undefined) {
      this.sharedData = { ...this.sharedData, [key]: value };
    }
  }

  getShared() {
    return this.sharedData;
  }

  flushShared(): void {
    this.sharedData = {};
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
    const sharedData = { ...this.sharedData, ...props };
    this.flushShared();

    return new Response({
      component,
      props: sharedData,
      rootView: this.config.rootView,
      version: this.config.assetsVersion,
      clearHistory: this.shouldClearHistory,
      encryptHistory: this.shouldEncryptHistory,
      manifestPath: this.config.manifestPath,
      serverRenderer: this.serverRenderer,
    });
  }

  location(url: string) {
    return {
      statusCode: HttpStatus.CONFLICT,
      url,
    };
  }
}
