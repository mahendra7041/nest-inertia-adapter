import { readFile } from "node:fs/promises";
import { Vite } from "./vite.js";

type Context = Record<string, any>;
type DirectiveHandler = (ctx: Context) => string;

export class TemplateEngine {
  private static directives: Record<string, DirectiveHandler> = {};

  static directive(name: string, handler: DirectiveHandler) {
    this.directives[name] = handler;
  }

  static render(template: string, ctx: Context = {}): string {
    template = template.replace(/{{\s*([\s\S]+?)\s*}}/g, (_, expr) => {
      const val = TemplateEngine.evalInCtx(expr, ctx);
      return val != null ? String(val) : "";
    });

    template = template.replace(/@(\w+)/g, (_, name) => {
      const fn = this.directives[name];
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

TemplateEngine.directive("vite", (ctx) =>
  ctx.isProd
    ? ""
    : `<script type="module" src="${ctx.vite("@vite/client")}"></script>`
);

TemplateEngine.directive("inertiaHead", (ctx) => ctx.inertiaHead);

TemplateEngine.directive("inertia", (ctx) =>
  ctx.isProd
    ? ctx.inertia
    : `<div id="${ctx.rootElementId}" data-page='${ctx.props}'></div>`
);

export async function vite(path: string, isProd: boolean) {
  if (!isProd) {
    return path;
  }
  const manifest = await Vite.getManifest();
  const assetPath = manifest[path];
  if (!assetPath) throw new Error(`Entry ${path} not found in manifest`);

  return assetPath;
}
