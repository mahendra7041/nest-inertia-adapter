import type { Serialize, Simplify } from "@tuyau/utils/types";
import { DeferProp, OptionalProp } from "./props.js";

export type MaybePromise<T> = T | Promise<T>;

export type PageProps = Record<string, unknown>;
export type Data = string | number | object | boolean;
export type SharedDatumFactory = (ctx: unknown) => MaybePromise<Data>;
export type SharedData = Record<string, Data | SharedDatumFactory>;
export type AssetsVersion = string | number | undefined;

export interface InertiaConfig<T extends SharedData = SharedData> {
  rootView?: string | ((ctx: unknown) => string);
  entrypoint?: string;
  buildDir?: string;
  manifestPath?: string;
  assetsVersion?: AssetsVersion;
  sharedData?: T;
  history?: {
    encrypt?: boolean;
  };
  ssr?: {
    enabled: boolean;
    pages?: string[] | ((ctx: unknown, page: string) => MaybePromise<boolean>);
    entrypoint?: string;
    bundle?: string;
  };
}

export interface ResolvedConfig<T extends SharedData = SharedData> {
  rootView: string | ((ctx: unknown) => string);
  buildDir: string;
  manifestPath: string;
  entrypoint?: string;
  assetsVersion: string | number;
  sharedData: T;
  history: { encrypt: boolean };
  ssr: {
    enabled: boolean;
    entrypoint: string;
    pages?: string[] | ((ctx: unknown, page: string) => MaybePromise<boolean>);
    bundle: string;
  };
}

export interface PageObject<TPageProps extends PageProps = PageProps> {
  ssrHead?: string[];
  ssrBody?: string;

  component: string;
  version: string | number;
  props: TPageProps;
  url: string;
  deferredProps?: Record<string, string[]>;
  mergeProps?: string[];
  encryptHistory?: boolean;
  clearHistory?: boolean;
}

type IsOptionalProp<T> = T extends OptionalProp<any>
  ? true
  : T extends DeferProp<any>
  ? true
  : false;

type InferProps<T> = {
  [K in keyof T as IsOptionalProp<T[K]> extends true
    ? K
    : never]+?: T[K] extends {
    callback: () => MaybePromise<infer U>;
  }
    ? U
    : T[K];
} & {
  [K in keyof T as IsOptionalProp<T[K]> extends true
    ? never
    : K]: T[K] extends {
    callback: () => MaybePromise<infer U>;
  }
    ? U
    : T[K] extends () => MaybePromise<infer U>
    ? U
    : T[K];
};

type ReturnsTypesSharedData<T extends SharedData> = {} extends T
  ? {}
  : InferProps<{
      [K in keyof T]: T[K] extends (...args: any[]) => MaybePromise<infer U>
        ? U
        : T[K];
    }>;

export type InferSharedProps<T extends SharedData> = ReturnsTypesSharedData<T>;

export interface SharedProps {}

export type InferPageProps<
  Controller,
  Method extends keyof Controller
> = Controller[Method] extends (...args: any[]) => any
  ? Simplify<
      Serialize<
        InferProps<
          Extract<Awaited<ReturnType<Controller[Method]>>, PageObject>["props"]
        > &
          SharedProps
      >
    >
  : never;

export type RenderInertiaSsrApp = (
  page: PageObject
) => Promise<{ head: string[]; body: string }>;
