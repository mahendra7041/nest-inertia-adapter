import { DynamicModule, Module } from "@nestjs/common";
import { InertiaConfig } from "./types.js";
import { defineConfig, INERTIA_CONFIG } from "./define_config.js";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Interceptor } from "./interceptor.js";
import { ResponseFactory } from "./response-factory.js";
import { Inertia } from "./inertia.js";

@Module({})
export class InertiaModule {
  static register(options: InertiaConfig): DynamicModule {
    return {
      module: InertiaModule,
      providers: [
        {
          provide: INERTIA_CONFIG,
          useValue: defineConfig(options),
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: Interceptor,
        },
        ResponseFactory,
        Inertia,
      ],
      exports: [ResponseFactory, Inertia],
    };
  }
}
