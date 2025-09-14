import type { ViteDevServer } from "vite";

export class Vite {
  static viteDevServer: ViteDevServer;

  static async register() {
    const { createServer } = await import("vite");
    this.viteDevServer = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
  }
}
