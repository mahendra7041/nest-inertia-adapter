import { readFile } from "node:fs/promises";
import type { ViteDevServer } from "vite";

export class Vite {
  static viteDevServer: ViteDevServer;
  static manifest: Record<string, any>;

  static async register() {
    const { createServer } = await import("vite");
    this.viteDevServer = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
  }

  static async getManifest() {
    if (this.manifest) {
      return this.manifest;
    }
    this.manifest = JSON.parse(
      await readFile("dist/.vite/manifest.json", "utf-8")
    );
    return this.manifest;
  }
}
