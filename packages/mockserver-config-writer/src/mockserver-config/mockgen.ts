import type { PackageJsonMockConfig } from '../types/index.js';

export const STANDARD_MOCKSERVER_MODULE = '@sap-ux/ui5-middleware-fe-mockserver';
export const MOCKGEN_MODULE = '@sap-ux/mockserver-data-generator';
export const MOCKGEN_VERSION = '0.1.0';
export const MOCKGEN_PROVIDER = '@sap-ux/mockserver-data-generator/fe-mockserver';
export const MOCKGEN_LAUNCHER_PREFIX = 'mockserver-data-generator start -- ';

/**
 * Whether the standard FE mockserver configuration can host MockGen.
 *
 * @param config package configuration selected by the caller
 * @returns whether MockGen wiring should be generated
 */
export function supportsMockgen(config?: PackageJsonMockConfig): boolean {
    return (
        !config?.skip &&
        (config?.mockserverModule === undefined || config.mockserverModule === STANDARD_MOCKSERVER_MODULE)
    );
}

/**
 * Check for command syntax that npm's shell would evaluate instead of passing
 * to the launcher.
 *
 * @param script package script
 * @returns whether the script is a shell-free Fiori invocation
 */
function isSimpleFioriCommand(script: string): boolean {
    const command = script.startsWith(MOCKGEN_LAUNCHER_PREFIX) ? script.slice(MOCKGEN_LAUNCHER_PREFIX.length) : script;
    for (const match of command.matchAll(/'(?:[^']*)'|"(?:\\.|[^"\\])*"/gu)) {
        if (match[0].startsWith('"') && /[$`]/u.test(match[0])) {
            return false;
        }
    }
    const unquoted = command.replaceAll(/'(?:[^']*)'|"(?:\\.|[^"\\])*"/gu, '');
    return !/[&|;<>`$'"\\\n\r]/u.test(unquoted) && /^\s*fiori\s+run(?:\s|$)/u.test(command);
}

/**
 * Add the launcher only to a shell-free Fiori command.
 *
 * @param script package script
 * @returns idempotently wrapped script
 */
export function addMockgenLauncher(script: string): string {
    return script.startsWith(MOCKGEN_LAUNCHER_PREFIX) || !isSimpleFioriCommand(script)
        ? script
        : `${MOCKGEN_LAUNCHER_PREFIX}${script}`;
}

/**
 * Remove only the exact launcher owned by this writer.
 *
 * @param script package script
 * @returns script without the owned prefix
 */
export function removeMockgenLauncher(script: string): string {
    return script.startsWith(MOCKGEN_LAUNCHER_PREFIX) ? script.slice(MOCKGEN_LAUNCHER_PREFIX.length) : script;
}
