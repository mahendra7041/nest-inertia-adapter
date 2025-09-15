import { readFileSync } from "node:fs";
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

  static getManifest() {
    if (this.manifest) {
      return this.manifest;
    }
    this.manifest = JSON.parse(
      readFileSync("dist/.vite/manifest.json", "utf-8")
    );
    return this.manifest;
  }
}
