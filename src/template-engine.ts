export type Context = Record<string, any>;
export type DirectiveHandler = (ctx: Context) => string;

export class TemplateEngine {
  private static directives: Record<string, DirectiveHandler> = {};

  static directive(name: string, handler: DirectiveHandler): void {
    this.directives[name] = handler;
  }

  static render(template: string, ctx: Context = {}): string {
    template = template.replace(/{{\s*([^{}]+?)\s*}}/g, (_, expr) => {
      const val = TemplateEngine.evalInCtx(expr, ctx);
      return TemplateEngine.escape(val);
    });

    template = template.replace(/@(\w+)/g, (_, name) => {
      const fn = this.directives[name];
      return fn ? fn(ctx) : "";
    });

    return template;
  }

  private static escape(val: unknown): string {
    return String(val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private static evalInCtx(expr: string, ctx: Context): any {
    return new Function("ctx", `with (ctx) { return ${expr}; }`)(ctx);
  }
}

TemplateEngine.directive("viteReactRefresh", function () {
  return [
    `<script type="module">`,
    `import RefreshRuntime from '{{ assetsUrl("@react-refresh") }}'`,
    `RefreshRuntime.injectIntoGlobalHook(window)`,
    `window.$RefreshReg$ = () => {}`,
    `window.$RefreshSig$ = () => (type) => type`,
    `window.__vite_plugin_react_preamble_installed__ = true`,
    `</script>`,
  ].join("\n");
});

TemplateEngine.directive(
  "vite",
  () => `<script type="module" src="{{ assetsUrl("@vite") }}"></script>`
);

TemplateEngine.directive("inertiaHead", () => `{{ inertiaHead }}`);
TemplateEngine.directive(
  "inertia",
  () => `<div id="{{ rootElementId }}" data-page={{ props }}></div>`
);
