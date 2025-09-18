import { FilesDetector } from "./files_detector.js";
import type { InertiaConfig, ResolvedConfig, SharedData } from "./types.js";

export const INERTIA_CONFIG = "INERTIA_CONFIG";

export async function defineConfig<T extends SharedData>(
  config: InertiaConfig<T>
): Promise<ResolvedConfig<T>> {
  const detector = new FilesDetector();

  return {
    assetsVersion: config.assetsVersion ?? "1",
    buildDir: "build",
    rootView:
      config.rootView ??
      (await detector.detectIndexEntrypoint("inertia/index.html")),
    sharedData: config.sharedData! || {},
    history: { encrypt: config.history?.encrypt ?? false },
    entrypoint:
      config.entrypoint ??
      (await detector.detectEntrypoint("inertia/src/app.ts")),
    ssr: {
      enabled: config.ssr?.enabled ?? false,
      ...(config.ssr?.pages !== undefined ? { pages: config.ssr.pages } : {}),
      entrypoint:
        config.ssr?.entrypoint ??
        (await detector.detectSsrEntrypoint("inertia/src/ssr.ts")),
      bundle:
        config.ssr?.bundle ??
        (await detector.detectSsrBundle("build/ssr/ssr.js")),
    },
  };
}
