import { Vite } from "./vite.js";

export default class ViteMiddleware {
  constructor() {
    if (!Vite.viteDevServer) {
      Vite.register();
    }
  }

  async use(req: any, res: any, next: () => any) {
    if (!Vite.viteDevServer) {
      return next();
    }

    await new Promise((resolve) => {
      Vite.viteDevServer.middlewares.handle(req, res, () => {
        return resolve(next());
      });
    });
  }
}
