import { Vite } from "./vite.js";

import { pathToFileURL } from "node:url";
import type {
  PageObject,
  RenderInertiaSsrApp,
  ResolvedConfig,
} from "./types.js";
import type { ModuleRunner } from "vite/module-runner";
import type { ServerModuleRunnerOptions } from "vite";

export class ServerRenderer {
  static runtime: ModuleRunner;

  constructor(protected config: ResolvedConfig, protected vite?: Vite) {}

  async render(pageObject: PageObject) {
    let render: { default: RenderInertiaSsrApp };
    const devServer = Vite.viteDevServer;

    if (devServer) {
      ServerRenderer.runtime ??= await this!.createModuleRunner();
      ServerRenderer.runtime.clearCache();
      render = await ServerRenderer.runtime.import(this.config.ssr.entrypoint!);
    } else {
      render = await import(pathToFileURL(this.config.ssr.bundle).href);
    }

    const result = await render.default(pageObject);
    return { head: result.head, body: result.body };
  }

  async createModuleRunner(
    options: ServerModuleRunnerOptions = {}
  ): Promise<ModuleRunner> {
    const { createServerModuleRunner } = await import("vite");
    return createServerModuleRunner(
      Vite.viteDevServer!.environments.ssr,
      options
    );
  }
}
