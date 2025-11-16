import { createHash } from "node:crypto";
import { readFile } from "fs/promises";
import type { AssetsVersion } from "./types.js";

export class VersionCache {
  #cachedVersion?: AssetsVersion;

  constructor(
    private readonly manifestPath: string,
    private readonly assetsVersion?: AssetsVersion
  ) {
    this.#cachedVersion = assetsVersion;
  }

  private async computeVersionFromManifest(): Promise<AssetsVersion> {
    try {
      const manifestFile = await readFile(this.manifestPath, "utf-8");
      this.#cachedVersion = createHash("md5")
        .update(manifestFile)
        .digest("hex");
    } catch {
      console.warn(
        `[nest-inertia-adapter] Manifest file not found at "${this.manifestPath}". Falling back to version "1".`
      );
      this.#cachedVersion = "1";
    }
    return this.#cachedVersion;
  }

  async getVersion(): Promise<AssetsVersion> {
    if (this.#cachedVersion) {
      return this.#cachedVersion;
    }
    if (this.assetsVersion) {
      this.#cachedVersion = this.assetsVersion;
      return this.#cachedVersion;
    }
    await this.computeVersionFromManifest();
    return this.#cachedVersion;
  }

  async setVersion(version: AssetsVersion) {
    this.#cachedVersion = version;
  }
}
