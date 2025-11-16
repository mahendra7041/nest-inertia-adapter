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

  static ViteDevMiddleware() {
    if (!this.viteDevServer) {
      Vite.register();
    }

    const isDev = process.env.NODE_ENV !== "production";

    return (req, res, next) => {
      if (!isDev) {
        return next();
      }

      this.viteDevServer.middlewares.handle(req, res, () => next());
    };
  }
}
