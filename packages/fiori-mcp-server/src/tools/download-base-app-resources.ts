import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as fs from 'node:fs';
import type { DownloadBaseAppResourcesInput } from '../types/index.js';
// @ui5/project is a runtime dependency of this package (installed alongside it
// via npm), not bundled. We use it to build a project graph against the user's
// adaptation project. @ui5/task-adaptation is loaded differently (dynamically
// from the user's project) because we want to exercise the exact version they
// installed — see further below in this file.
import { graphFromPackageDependencies } from '@ui5/project/graph';
import { readUi5Config } from '@sap-ux/adp-tooling/src/base/helper.js';
import type { systemPath } from './get-merged-manifest.js';

// eslint-disable-next-line no-new-func
const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;

type TaskAdaptationModule = {
    downloadBaseAppResources?: DownloadBaseAppResourcesFn;
    default?: { downloadBaseAppResources?: DownloadBaseAppResourcesFn };
};

type HierarchyVariant = {
    id: string;
    prefix: string;
    reference: string;
    files: ReadonlyMap<string, string>;
};

type DownloadBaseAppResourcesResult = {
    baseAppFiles: Record<string, string>;
    hierarchyVariants: HierarchyVariant[];
};

type DownloadBaseAppResourcesFn = (args: {
    workspace: unknown;
    options: { configuration: unknown; projectNamespace: string };
}) => Promise<DownloadBaseAppResourcesResult>;

/**
 * Downloads all base app resources for an SAP UI5 Adaptation Project by
 * delegating to `downloadBaseAppResources` from the project's installed
 * `@ui5/task-adaptation`.
 *
 * The user's local copy of `@ui5/task-adaptation` is loaded dynamically from
 * the project's `node_modules`, so a linked / patched version is exercised.
 *
 * Each downloaded resource is written to `webapp/.context/<name>` inside the
 * project; the full result is also returned as a JSON string.
 *
 * @param params Tool input.
 * @returns JSON-serialised result from `@ui5/task-adaptation`, including the
 *   `baseAppFiles` object and any other fields it returns.
 */
export async function downloadBaseAppResources(params: DownloadBaseAppResourcesInput): Promise<string> {
    const graph = await graphFromPackageDependencies({
        cwd: params.appPath,
        resolveFrameworkDependencies: false
    });

    const project = graph.getRoot() as {
        getWorkspace: () => unknown;
        getNamespace: () => string;
        getCustomTasks: () => Array<{ name: string; configuration?: unknown }> | undefined;
    };

    const workspace = project.getWorkspace();
    const projectNamespace = project.getNamespace();
    const customTasks = project.getCustomTasks() ?? [];
    let configuration: Record<string, unknown> =
        (customTasks.find((t) => t.name === 'app-variant-bundler-build')?.configuration as
            | Record<string, unknown>
            | undefined) ?? {};

    if (Object.keys(configuration).length === 0) {
        const ui5Config = await readUi5Config(params.appPath, 'ui5.yaml');
        const adp = ui5Config.findCustomMiddleware<{ adp?: { target?: Partial<systemPath> } }>('fiori-tools-preview')
            ?.configuration?.adp;
        if (!adp) {
            throw new Error(
                `Cannot determine task-adaptation configuration: neither an "app-variant-bundler-build" custom task nor a "fiori-tools-preview" custom middleware with "adp" config was found in ${params.appPath}.`
            );
        }
        configuration = { ...adp, type: 'abap' };
    }
    const entry = path.join(params.appPath, 'node_modules', '@ui5', 'task-adaptation', 'dist', 'index.js');
    const mod = (await dynamicImport(pathToFileURL(entry).href)) as TaskAdaptationModule;
    const download = mod.downloadBaseAppResources ?? mod.default?.downloadBaseAppResources;
    if (typeof download !== 'function') {
        throw new Error(
            `@ui5/task-adaptation does not export downloadBaseAppResources (keys: ${Object.keys(mod).join(', ')})`
        );
    }

    // @ui5/task-adaptation logs progress via @ui5/logger, which writes to
    // stdout. The MCP stdio transport parses every stdout line as JSON-RPC,
    // so any log line corrupts the protocol and the client disconnects mid
    // call. Redirect stdout to stderr for the lifetime of the download.
    const files = await withStdoutOnStderr(() =>
        download({
            workspace,
            options: { configuration, projectNamespace }
        })
    );
    await Promise.all(
        Object.entries(files.baseAppFiles).map(([filename, content]) =>
            writeBaseAppResources(params.appPath, filename, content)
        )
    );

    await Promise.all(
        files.hierarchyVariants.flatMap((variant) =>
            Array.from(variant.files, ([filename, content]) =>
                writeBaseAppResources(params.appPath, path.posix.join(variant.id, filename), content)
            )
        )
    );

    return path.join(params.appPath, 'webapp', '.context');
}

/**
 * Runs `fn` while redirecting every `process.stdout.write` call to stderr.
 * The MCP stdio transport reserves stdout for JSON-RPC messages; any noise
 * (like the progress logs emitted by `@ui5/task-adaptation` via `@ui5/logger`)
 * crashes the protocol parser on the client side.
 *
 * @param fn Function to invoke with stdout temporarily redirected.
 * @returns Whatever `fn` resolves to.
 */
async function withStdoutOnStderr<T>(fn: () => Promise<T>): Promise<T> {
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = process.stderr.write.bind(process.stderr) as typeof process.stdout.write;
    try {
        return await fn();
    } finally {
        process.stdout.write = originalWrite;
    }
}

/**
 * Writes a single base app resource into the `webapp/.context` folder of the
 * adaptation project, creating parent directories as needed.
 *
 * @param appPath Absolute path to the adaptation project root.
 * @param name Resource filename as returned by `@ui5/task-adaptation` (may
 *   contain forward-slash separated path segments).
 * @param content Resource file content.
 */
async function writeBaseAppResources(appPath: string, name: string, content: string): Promise<void> {
    const resourcePath = path.join(appPath, '.context', name);
    await fs.promises.mkdir(path.dirname(resourcePath), { recursive: true });
    await fs.promises.writeFile(resourcePath, content, 'utf-8');
}
