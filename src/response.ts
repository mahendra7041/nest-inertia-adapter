import type { Request, Response as ExpressResponse } from "express";
import { PageObject, PageProps } from "./types.js";
import { readFile } from "fs/promises";
import { InertiaHeaders } from "./headers.js";
import {
  AlwaysProp,
  DeferProp,
  ignoreFirstLoadSymbol,
  MergeableProp,
  MergeProp,
  OptionalProp,
} from "./props.js";
import { ServerRenderer } from "./server_renderer.js";
import { TemplateContext, TemplateEngine2 } from "./template-engine2.0.js";

type ResponseConfig = {
  component: string;
  props: {
    [x: string]: any;
  };
  rootView: string | ((ctx: unknown) => string);
  version: string | number;
  clearHistory: boolean;
  encryptHistory: boolean;
  manifestPath: string;
  serverRenderer?: ServerRenderer;
};

export class Response {
  private request: Request;
  private response: ExpressResponse;
  private isProd: boolean;
  constructor(private readonly config: ResponseConfig) {
    this.isProd = process.env.NODE_ENV === "production";
  }

  with(key: string, value: any) {
    this.config.props = { ...this.config.props, [key]: value };
    return this;
  }

  get rootView() {
    return typeof this.config.rootView == "function"
      ? this.config.rootView({
          request: this.request,
          response: this.response,
        })
      : this.config.rootView;
  }

  async render(props: PageObject) {
    const template = await readFile(this.rootView, "utf8");
    const data: TemplateContext = {
      viewProps: {
        component: this.config.component,
        title: "My App",
        props,
      },
      vite: {
        assetUrl: (file) => "/" + file,
        isProd: this.isProd,
        devServer: "",
        manifestPath: this.config.manifestPath,
      },
    };
    if (this.config.serverRenderer) {
      const ssr = await this.config.serverRenderer.render(props);
      props.ssrBody = ssr.body;
      props.ssrHead = ssr.head;
    }

    const tEngine = new TemplateEngine2(data);
    return tEngine.render(template);
  }

  async toResponse(request: any, response: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.request = request;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.response = response;

    const pageObject = await this.buildPageObject(
      this.config.component,
      this.config.props
    );
    const isInertiaRequest = !!this.request.headers[InertiaHeaders.Inertia];
    if (isInertiaRequest) {
      return pageObject;
    }

    return await this.render(pageObject);
  }

  isPartial(component: string) {
    return this.request.headers[InertiaHeaders.PartialComponent] === component;
  }

  resolveOnly(props: PageProps) {
    const partialOnlyHeader = this.request.headers[
      InertiaHeaders.PartialOnly
    ] as string | undefined;
    const only = partialOnlyHeader!.split(",").filter(Boolean);
    const newProps: PageProps = {};

    for (const key of only) newProps[key] = props[key];

    return newProps;
  }

  resolveExcept(props: PageProps) {
    const partialExceptHeader = this.request.headers[
      InertiaHeaders.PartialExcept
    ] as string | undefined;
    const except = partialExceptHeader!.split(",").filter(Boolean);

    for (const key of except) delete props[key];

    return props;
  }

  pickPropsToResolve(component: string, props: PageProps = {}) {
    const isPartial = this.isPartial(component);
    let newProps = props;

    if (!isPartial) {
      newProps = Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(props).filter(([_, value]) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (value && (value as any)[ignoreFirstLoadSymbol]) return false;

          return true;
        })
      );
    }

    const partialOnlyHeader = this.request.headers[InertiaHeaders.PartialOnly];
    if (isPartial && partialOnlyHeader) newProps = this.resolveOnly(props);

    const partialExceptHeader =
      this.request.headers[InertiaHeaders.PartialExcept];
    if (isPartial && partialExceptHeader)
      newProps = this.resolveExcept(newProps);

    for (const [key, value] of Object.entries(props)) {
      if (value instanceof AlwaysProp) newProps[key] = props[key];
    }

    return newProps;
  }

  async resolveProp(key: string, value: any) {
    if (
      value instanceof OptionalProp ||
      value instanceof MergeProp ||
      value instanceof DeferProp ||
      value instanceof AlwaysProp
    ) {
      return [key, await value.callback()];
    }

    return [key, value];
  }

  async resolvePageProps(props: PageProps = {}) {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(props).map(async ([key, value]) => {
          if (typeof value === "function") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result = await value(this.request, this.response);
            return this.resolveProp(key, result);
          }

          return this.resolveProp(key, value);
        })
      )
    );
  }

  resolveDeferredProps(component: string, pageProps?: PageProps) {
    if (this.isPartial(component)) return {};

    const deferredProps = Object.entries(pageProps || {})
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, value]) => value instanceof DeferProp)
      .map(([key, value]) => ({
        key,
        group: (value as DeferProp<any>).getGroup(),
      }))
      .reduce((groups, { key, group }) => {
        if (!groups[group]) groups[group] = [];

        groups[group].push(key);
        return groups;
      }, {} as Record<string, string[]>);

    return Object.keys(deferredProps).length ? { deferredProps } : {};
  }

  resolveMergeProps(pageProps?: PageProps) {
    const inertiaResetHeader =
      (this.request.headers[InertiaHeaders.Reset] as string | undefined) || "";
    const resetProps = new Set(inertiaResetHeader.split(",").filter(Boolean));

    const mergeProps = Object.entries(pageProps || {})
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, value]) => value instanceof MergeableProp && value.shouldMerge
      )
      .map(([key]) => key)
      .filter((key) => !resetProps.has(key));

    return mergeProps.length ? { mergeProps } : {};
  }

  async buildPageObject<TPageProps extends PageProps>(
    component: string,
    pageProps?: TPageProps
  ): Promise<PageObject<TPageProps>> {
    const propsToResolve = this.pickPropsToResolve(component, pageProps);

    return {
      component: this.config.component,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      props: await this.resolvePageProps(propsToResolve),
      url: this.request.url || "/",
      version: this.config.version,
      clearHistory: this.config.clearHistory,
      encryptHistory: this.config.encryptHistory,
      ...this.resolveMergeProps(pageProps),
      ...this.resolveDeferredProps(component, pageProps),
    };
  }
}
