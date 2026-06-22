import { access } from 'node:fs/promises';
import path, { join, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GetMergedManifestInput, ExecuteFunctionalityOutput } from '../types/index.js';
import { GET_MERGED_MANIFEST } from '../constant.js';
// @ui5/project is a runtime dependency of this package (installed alongside it
// via npm), not bundled. We use it to build a project graph against the user's
// adaptation project. @ui5/task-adaptation is loaded differently (dynamically
// from the user's project) because we want to exercise the exact version they
// installed — see further below in this file.
import { graphFromPackageDependencies } from '@ui5/project/graph';

interface PreflightOk {
    ok: true;
}
interface PreflightError {
    ok: false;
    message: string;
}

/**
 * Checks whether a filesystem path exists and is aaccessible.
 *
 * @param path Absolute or relative filesystem path.
 * @returns True when the path is accessible.
 */
async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validates the project shape and required dependencies before running the
 * in-process manifest validation.
 *
 * @param appPath Absolute path to the adaptation project root.
 * @returns A success descriptor or an error descriptor.
 */
async function preflight(appPath: string): Promise<PreflightOk | PreflightError> {
    if (!isAbsolute(appPath)) {
        return { ok: false, message: `appPath must be an absolute path. Received: ${appPath}` };
    }
    if (!(await fileExists(appPath))) {
        return { ok: false, message: `appPath does not exist: ${appPath}` };
    }
    if (!(await fileExists(join(appPath, 'webapp', 'manifest.appdescr_variant')))) {
        return {
            ok: false,
            message: `Not an adaptation project: missing webapp/manifest.appdescr_variant at ${appPath}`
        };
    }
    if (!(await fileExists(join(appPath, 'node_modules', '@ui5', 'task-adaptation')))) {
        return {
            ok: false,
            message: `node_modules/@ui5/task-adaptation not found in ${appPath}. Run npm install before validating.`
        };
    }
    /*if (!(await fileExists(join(appPath, 'node_modules', '@ui5', 'project')))) {
        return {
            ok: false,
            message: `node_modules/@ui5/project not found in ${appPath}. Run npm install before validating.`
        };
    }*/
    return { ok: true };
}

/**
 * Builds the standard {@link ExecuteFunctionalityOutput} envelope.
 *
 * @param status Either 'Success' or 'Error'.
 * @param message Human-readable summary.
 * @param params Original tool input.
 * @param extra Additional fields merged into `parameters`.
 * @returns Standard tool envelope.
 */
function envelope(
    status: 'Success' | 'Error',
    message: string,
    params: GetMergedManifestInput,
    extra: Record<string, unknown> = {}
): ExecuteFunctionalityOutput {
    return {
        functionalityId: GET_MERGED_MANIFEST,
        status,
        message,
        parameters: { ...params, ...extra },
        appPath: params.appPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}

// eslint-disable-next-line no-new-func
const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;

/**
 * Validates the descriptor changes of an SAP UI5 Adaptation Project by calling
 * `validateManifestChanges` from the project's installed `@ui5/task-adaptation`.
 *
 * Unlike a full build, this does not contact any backend. It re-runs the
 * task-adaptation pipeline against a previously cached base app (the result of
 * the most recent online build) so the project's manifest changes are exercised
 * by their registered change handlers; any malformed change throws.
 *
 * The user's local copy of `@ui5/task-adaptation` is loaded via `createRequire`
 * against the project, so a linked / patched version is exercised.
 *
 * @param params Tool input.
 * @returns Standard tool execution envelope.
 */
export async function getMergedManifest(params: GetMergedManifestInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath } = params;
    if (!appPath) {
        return envelope('Error', 'Missing required parameter: appPath.', params);
    }

    const preflightStatus = await preflight(appPath);
    if (!preflightStatus.ok) {
        return envelope('Error', preflightStatus.message, params);
    }

    const graph = await graphFromPackageDependencies({
        cwd: params.appPath,
        resolveFrameworkDependencies: false
    });

    const project = graph.getRoot() as any;

    const workspace = project.getWorkspace();
    const projectNamespace = project.getNamespace();
    const configuration =
        (project.getCustomTasks() ?? []).find((t: any) => t.name === 'app-variant-bundler-build')?.configuration ?? {};

    //console.info?.(`task-adaptation configuration: ${JSON.stringify(configuration)}`);

    const entry = path.join(params.appPath, 'node_modules', '@ui5', 'task-adaptation', 'dist', 'index.js');
    const mod = await dynamicImport(pathToFileURL(entry).href);
    const previewManifest = mod.previewManifest ?? mod.default?.previewManifest;
    if (typeof previewManifest !== 'function') {
        throw new Error(`@ui5/task-adaptation does not export previewManifest (keys: ${Object.keys(mod).join(', ')})`);
    }

    return previewManifest({
        workspace,
        options: { configuration, projectNamespace },
        taskUtil: {
            getTag: () => undefined,
            setTag: () => {},
            clearTag: () => {},
            STANDARD_TAGS: { OmitFromBuildResult: 'OmitFromBuildResult' }
        }
    });
    /*
    let validate: (args: {
        workspace: unknown;
        options: { projectNamespace: string; configuration: Record<string, unknown> };
        taskUtil: unknown;
    }) => Promise<ReadonlyMap<string, string>>;
    let createAdapter: (opts: { fsBasePath: string; virBasePath: string }) => unknown;
    let createWorkspace: (opts: { reader: unknown }) => unknown;
    try {
        const requireFromProject = createRequire(join(appPath, 'package.json'));
        const taskAdaptationEntry = requireFromProject.resolve('@ui5/task-adaptation/dist');
        // Resolve @ui5/fs through @ui5/task-adaptation's own resolution chain so
        // it works whether npm hoists @ui5/fs to the project root or nests it
        // under @ui5/task-adaptation/node_modules.
        const requireFromTaskAdaptation = createRequire(join(dirname(taskAdaptationEntry), 'package.json'));
        const taskAdaptationUrl = pathToFileURL(taskAdaptationEntry).href;
        const fsFactoryUrl = pathToFileURL(requireFromTaskAdaptation.resolve('@ui5/fs/resourceFactory')).href;
        const taskAdaptation = (await import(taskAdaptationUrl)) as {
            validateManifestChanges?: typeof validate;
        };
        const fsFactory = (await import(fsFactoryUrl)) as {
            createAdapter: typeof createAdapter;
            createWorkspace: typeof createWorkspace;
        };
        if (typeof taskAdaptation.validateManifestChanges !== 'function') {
            return envelope(
                'Error',
                `The installed @ui5/task-adaptation does not export validateManifestChanges. ` +
                    `Make sure the project uses a version that exposes this function.`,
                params
            );
        }
        validate = taskAdaptation.validateManifestChanges;
        createAdapter = fsFactory.createAdapter;
        createWorkspace = fsFactory.createWorkspace;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return envelope('Error', `Failed to load @ui5/task-adaptation from project: ${message}`, params);
    }

    let projectNamespace: string;
    try {
        const variantRaw = await readFile(join(appPath, 'webapp', 'manifest.appdescr_variant'), 'utf8');
        const variantObject = JSON.parse(variantRaw) as { id?: string };
        if (!variantObject.id) {
            return envelope('Error', 'manifest.appdescr_variant is missing an "id" field.', params);
        }
        projectNamespace = variantObject.id.replace(/\./g, '/');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return envelope('Error', `Failed to read manifest.appdescr_variant: ${message}`, params);
    }

    const configurationResult = await readAdaptationConfiguration(appPath);
    if (!configurationResult.ok) {
        return envelope('Error', configurationResult.message, params, { projectNamespace });
    }

    const projectReader = createAdapter({
        fsBasePath: join(appPath, 'webapp'),
        virBasePath: `/resources/${projectNamespace}/`
    });
    const workspace = createWorkspace({ reader: projectReader });
    const taskUtil = createTaskUtilStub();

    try {
        const mergedFiles = await validate({
            workspace,
            options: { projectNamespace, configuration: configurationResult.configuration },
            taskUtil
        });
        return envelope('Success', 'Manifest changes are valid.', params, {
            projectNamespace,
            fileCount: mergedFiles.size
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const hint = /No cached hierarchy found/i.test(message)
            ? ` Run a full build (build_adaptation_project) at least once to populate the task-adaptation cache, then re-run validation.`
            : '';
        return envelope('Error', `Manifest validation failed: ${message}${hint}`, params, { projectNamespace });
    }*/
}
