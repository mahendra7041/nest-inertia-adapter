import { locatePath } from "locate-path";
import { resolve } from "path";
import { cwd } from "process";

export class FilesDetector {
  constructor(private readonly appRoot: string = cwd()) {}

  async detectIndexEntrypoint(defaultPath: string) {
    const possiblesLocations = [
      "./inertia/index.html",
      "./resources/index.html",
    ];

    return await this.makePath(possiblesLocations, defaultPath);
  }

  async detectEntrypoint(defaultPath: string) {
    const possiblesLocations = [
      "./inertia/src/app.ts",
      "./inertia/src/app.tsx",
      "./inertia/src/app.jsx",
      "./resources/app.ts",
      "./resources/app.tsx",
      "./resources/app.jsx",
      "./resources/app.js",
    ];

    return await this.makePath(possiblesLocations, defaultPath);
  }

  async detectSsrEntrypoint(defaultPath: string) {
    const possiblesLocations = [
      "./inertia/src/ssr.ts",
      "./inertia/src/ssr.tsx",
      "./inertia/src/ssr.jsx",
      "./resources/ssr.ts",
      "./resources/ssr.tsx",
      "./resources/ssr.jsx",
      "./resources/ssr.js",
    ];

    return await this.makePath(possiblesLocations, defaultPath);
  }

  async detectSsrBundle(defaultPath: string) {
    const possiblesLocations = ["./build/ssr/ssr.js", "./build/ssr/ssr.mjs"];
    return this.makePath(possiblesLocations, defaultPath);
  }

  async detectManifest(defaultPath: string) {
    const possiblesLocations = ["./build/.vite/manifest.json"];
    return this.makePath(possiblesLocations, defaultPath);
  }

  async makePath(possiblesLocations: string[], defaultPath: string) {
    const path = await locatePath(possiblesLocations, {
      cwd: this.appRoot,
    });
    return resolve(path || defaultPath);
  }
}
