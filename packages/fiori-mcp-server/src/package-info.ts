// Values are injected at build time via esbuild --define.
// Fallbacks read from package.json at runtime for development (ts-node / jest).
import { createRequire } from 'node:module';

declare const __PACKAGE_NAME__: string;
declare const __PACKAGE_VERSION__: string;

function readPackageJson(): { name: string; version: string } {
    const require = createRequire(import.meta.url);
    return require('../package.json') as { name: string; version: string };
}

export const PACKAGE_NAME: string = typeof __PACKAGE_NAME__ === 'undefined' ? readPackageJson().name : __PACKAGE_NAME__;
export const PACKAGE_VERSION: string =
    typeof __PACKAGE_VERSION__ === 'undefined' ? readPackageJson().version : __PACKAGE_VERSION__;
