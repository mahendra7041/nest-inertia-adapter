import { encode } from "html-entities";
import fs from "node:fs";
import path from "node:path";

type TemplateContext = {
  viewProps?: Record<string, any>;
  page?: Record<string, any>;
  vite?: {
    assetUrl?: (file: string) => string;
    isProd: boolean;
    manifestPath?: string;
    devServer?: string;
  };
  inertia?: {
    ssr?: boolean;
    ssrBody?: string;
    ssrHead?: string[];
  };
};

type ViteManifest = Record<
  string,
  {
    file: string;
    src?: string;
    isEntry?: boolean;
    css?: string[];
    imports?: string[];
  }
>;

export class TemplateEngine2 {
  private manifest: ViteManifest | null = null;

  constructor(private context: TemplateContext = {}) {
    if (context.vite?.isProd && context.vite.manifestPath) {
      const manifestFile = fs.readFileSync(
        path.resolve(context.vite.manifestPath),
        "utf-8"
      );
      this.manifest = JSON.parse(manifestFile);
    }
  }

  private url(file: string): string {
    return this.context.vite?.assetUrl
      ? this.context.vite.assetUrl(file)
      : "/" + file;
  }

  private resolveVariable(pathExpr: string): any {
    return pathExpr.split(".").reduce((val: any, key: string) => {
      return val && typeof val === "object" && key in val ? val[key] : "";
    }, this.context.viewProps);
  }

  private interpolate(str: string): string {
    return str.replace(/{{\s*(.*?)\s*}}/g, (_, expr) => {
      try {
        return String(this.resolveVariable(expr) ?? "");
      } catch {
        return "";
      }
    });
  }

  private parseArgs(raw: string): string[] {
    try {
      let normalized = raw.trim();

      normalized = normalized.replace(/'/g, '"');
      normalized = normalized.replace(/\s+/g, " ");
      if (!normalized.startsWith("[") || !normalized.endsWith("]")) {
        throw new Error("Only array syntax is supported in @vite");
      }

      const parsed: string[] = JSON.parse(normalized);

      return parsed.map((f) => this.interpolate(f));
    } catch (e) {
      console.error("Failed to parse @vite args:", raw, e);
      return [];
    }
  }

  private renderViteScripts(files: string[]): string {
    if (!this.context.vite) return "";

    if (!this.context.vite.isProd) {
      return files
        .map(
          (file) =>
            `<script type="module" src="${this.context.vite?.devServer}/${file}"></script>`
        )
        .join("\n");
    }

    const html: string[] = [];
    const seen = new Set<string>();

    const pushFile = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      html.push(file);
    };

    const processEntry = (file: string) => {
      const entry = this.manifest?.[file];
      if (!entry) {
        console.warn(`[vite] Missing manifest entry for: ${file}`);
        return;
      }

      entry.imports?.forEach((i) => {
        const imported = this.manifest?.[i];
        if (imported) {
          pushFile(
            `<link rel="modulepreload" href="${this.url(imported.file)}">`
          );
          imported.css?.forEach((c) =>
            pushFile(`<link rel="stylesheet" href="${this.url(c)}">`)
          );
        }
      });

      entry.css?.forEach((c) =>
        pushFile(`<link rel="stylesheet" href="${this.url(c)}">`)
      );

      pushFile(`<script type="module" src="${this.url(entry.file)}"></script>`);
    };

    files.forEach((file) => processEntry(file));

    return html.join("\n");
  }

  render(template: string): string {
    // React Refresh
    template = template.replace(/@viteReactRefresh/g, () => {
      if (this.context.vite?.isProd) return "";
      return `<script type="module">
        import RefreshRuntime from '/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>`;
    });

    // Vite directive
    template = template.replace(/@vite\((.*?)\)/gs, (_, args) => {
      const files = this.parseArgs(args);
      return this.renderViteScripts(files);
    });

    // Inertia Head
    template = template.replace(/@inertiaHead/g, () => {
      if (this.context.inertia?.ssr) {
        return this.context.inertia.ssrHead?.join("\n") as string;
      }
      return "";
    });

    // Inertia App
    template = template.replace(/@inertia/g, () => {
      if (this.context.inertia?.ssr) {
        return this.context.inertia.ssrBody as string;
      }
      const pageJson = encode(
        JSON.stringify(this.context.viewProps?.props ?? {})
      );
      return `<div id="app" data-page='${pageJson}'></div>`;
    });

    // Interpolations (last pass)
    return this.interpolate(template);
  }
}
