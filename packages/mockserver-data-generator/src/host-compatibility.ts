import { createRequire } from 'node:module';
import { resolve } from 'node:path';

export const MOCK_DATA_GENERATOR_HOST_PACKAGE = '@sap-ux/ui5-middleware-fe-mockserver';
export const REQUIRED_MOCK_DATA_GENERATOR_API_VERSION = 1 as const;
export const HOST_COMPATIBILITY_ERROR =
    'MockGen requires a compatible @sap-ux/ui5-middleware-fe-mockserver with mock data generator API version 1. Run npm run start-mock without --mockgen to use standard mock data.';

export type MockserverHostLoader = (cwd: string, packageName: string) => unknown;

export interface MockserverHostCompatibilityOptions {
    cwd?: string;
    load?: MockserverHostLoader;
}

/**
 * Load the fixed middleware package using the application's dependency graph.
 *
 * @param cwd application directory used for module resolution
 * @param packageName fixed middleware package name
 * @returns the application-installed middleware export
 */
function loadInstalledMockserver(cwd: string, packageName: string): unknown {
    const requireFromApplication = createRequire(resolve(cwd, 'package.json'));
    return requireFromApplication(packageName);
}

/**
 * Read the marker as a data property without invoking an exported accessor.
 *
 * @param hostModule middleware package export
 * @returns the declared mock data generator API version, when present
 */
function mockDataGeneratorApiVersion(hostModule: unknown): unknown {
    if ((typeof hostModule !== 'object' && typeof hostModule !== 'function') || hostModule === null) {
        return undefined;
    }
    const descriptor = Object.getOwnPropertyDescriptor(hostModule, 'MOCK_DATA_GENERATOR_API_VERSION');
    return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

/**
 * Require the application-installed FE mockserver to advertise provider API version 1.
 *
 * @param options application resolution and test injection options
 */
export function assertCompatibleMockserver(options: MockserverHostCompatibilityOptions = {}): void {
    const cwd = options.cwd ?? process.cwd();
    const load = options.load ?? loadInstalledMockserver;
    let hostModule: unknown;
    try {
        hostModule = load(cwd, MOCK_DATA_GENERATOR_HOST_PACKAGE);
    } catch {
        throw new Error(HOST_COMPATIBILITY_ERROR);
    }
    if (mockDataGeneratorApiVersion(hostModule) !== REQUIRED_MOCK_DATA_GENERATOR_API_VERSION) {
        throw new Error(HOST_COMPATIBILITY_ERROR);
    }
}
