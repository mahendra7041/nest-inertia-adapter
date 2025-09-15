import { readFile } from "fs/promises";
import { ServerRenderer } from "./server_renderer.js";
import { PageObject } from "./types.js";
import { Vite } from "./vite.js";
import { encode } from "html-entities";

type Context = Record<string, any>;
type DirectiveHandler = (ctx: Context) => string;

export function vite(
  path: string,
  isProd: boolean
): { file: string; chunks: string[] } {
  if (!isProd) {
    return {
      file: `/${path}`,
      chunks: [],
    };
  }

  const manifest = Vite.getManifest();
  const asset = manifest[path];
  if (!asset) throw new Error(`Entry ${path} not found in manifest`);

  const file = `/${asset.file}`;
  const css = (asset.css || []).map((c: string) => `/${c}`);

  const chunks = css.map(
    (href: string) => `<link rel="stylesheet" crossorigin href="${href}">`
  );

  return { file, chunks };
}

export class TemplateEngine {
  private static directives: Record<string, DirectiveHandler> = {};

  static directive(name: string, handler: DirectiveHandler) {
    this.directives[name] = handler;
  }

  constructor(private readonly serverRenderer?: ServerRenderer) {}

  async render(view: string, page: PageObject): Promise<string> {
    let template = await readFile(view, "utf8");

    if (this.serverRenderer) {
      const ssr = await this.serverRenderer.render(page);
      page.ssrBody = ssr.body;
      page.ssrHead = ssr.head.join("\n");
    }

    const isProd = process.env.NODE_ENV === "production";

    const ctx = {
      props: encode(JSON.stringify(page)),
      inertia: page.ssrBody,
      inertiaHead: page.ssrHead,
      component: page.component,
      ssr: !!this.serverRenderer,
      rootElementId: "app",
      isProd,
      chunks: [] as string[],
      vite: (path: string) => {
        const res = vite(path, isProd);
        ctx.chunks.push(...res.chunks);
        return res.file;
      },
    };

    template = template.replace(/{{\s*([\s\S]+?)\s*}}/g, (_, expr) => {
      const val = TemplateEngine.evalInCtx(expr, ctx);
      return val != null ? String(val) : "";
    });

    template = template.replace(/@(\w+)/g, (_, name) => {
      const fn = TemplateEngine.directives[name];
      return fn ? fn(ctx) : "";
    });

    return template;
  }

  private static evalInCtx(expr: string, ctx: Context) {
    return new Function("ctx", `with (ctx) { return ${expr}; }`)(ctx);
  }
}

TemplateEngine.directive("viteReactRefresh", (ctx) => {
  if (ctx.isProd) return "";
  return [
    `<script type="module">`,
    `import RefreshRuntime from '${ctx.vite("@react-refresh")}'`,
    `RefreshRuntime.injectIntoGlobalHook(window)`,
    `window.$RefreshReg$ = () => {}`,
    `window.$RefreshSig$ = () => (type) => type`,
    `window.__vite_plugin_react_preamble_installed__ = true`,
    `</script>`,
  ].join("\n");
});

TemplateEngine.directive("inertiaHead", (ctx) => ctx.inertiaHead || "");

TemplateEngine.directive("inertia", (ctx) =>
  ctx.ssr
    ? ctx.inertia
    : `<div id="${ctx.rootElementId}" data-page='${ctx.props}'></div>`
);

TemplateEngine.directive("vite", (ctx) =>
  ctx.isProd
    ? ctx.chunks.join("\n")
    : `<script type="module" src="${ctx.vite("@vite/client")}"></script>`
);
