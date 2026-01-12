const path = require('node:path');
let pathMappingFn = null;
let ui5VersionCache = null;

/**
 * Processes the resources of a UI5 project and updates the path mapping.
 * @param {object} resources The resources to process.
 * @param {object} ui5PathMapping The mapping object to update.
 * @param {boolean} isRootProject Whether the project is the root project.
 * @param {boolean} isReusableLibrary Whether the project is a reusable library.
 * @param {string} namespace The namespace of the project.
 * @param {string} sourceDirectory The source directory of the project.
 */
function processDependencyResources(
    resources,
    ui5PathMapping,
    isRootProject,
    isReusableLibrary,
    namespace,
    sourceDirectory
) {
    for (const resource of resources) {
        const resourcePath = resource.getPath().replace(/\/resources\/|\/test-resources\//g, '');
        let itemPath;
        if (sourceDirectory) {
            itemPath = path.join(sourceDirectory, resourcePath);
        } else {
            itemPath = resource.getSourceMetadata?.().fsPath ?? resourcePath;
        }

        let targetPath = resourcePath.replace(/\\/g, '/');
        if (targetPath.endsWith('.js')) {
            targetPath = targetPath.replace('.js', '');
            ui5PathMapping[targetPath + '.js'] = itemPath;
        }

        if (isRootProject || isReusableLibrary) {
            if (targetPath.endsWith('.ts')) {
                targetPath = targetPath.replace('.ts', '');
                ui5PathMapping[targetPath + '.ts'] = itemPath;
            }
            if (namespace && !targetPath.startsWith(namespace)) {
                targetPath = path.posix.join(namespace, targetPath);
            }
        }

        ui5PathMapping[targetPath] = itemPath;
    }
}

/**
 * Retrieves the file map from the UI5 project.
 * @param {object} graph  The graph object.
 * @param {object} rootProject The root project.
 * @returns {Promise<{}>} A Promise that resolves with the file map.
 */
async function getFileMapFromUI5(graph, rootProject) {
    let ui5PathMapping = {};
    let ui5VersionInfo = {
        name: 'SAPUI5 Distribution',
        version: rootProject._config.framework?.version ?? '1.0.0',
        'buildTimestamp': '202412051614',
        'scmRevision': '',
        'libraries': []
    };

    await graph.traverseBreadthFirst(async ({ project: dependency }) => {
        const dependencyType = dependency.getType();
        const isReusableLibrary = dependencyType === 'library' && !dependency.isFrameworkProject();
        const isRootProject = dependency.getName() === rootProject.getName();
        const reader = dependency.getReader({ style: isReusableLibrary || isRootProject ? 'flat' : 'runtime' });
        let sourcePath;
        if (dependencyType !== 'module') {
            sourcePath = dependency.getSourcePath();
        }
        const namespace = dependency.getNamespace();
        ui5VersionInfo.libraries.push({
            name: dependency.getName(),
            version: dependency.getVersion(),
            buildTimestamp: '202412051614',
            scmRevision: ''
        });
        let resources = await reader.byGlob(`**/*.{ts,tsx,js,xml,properties,json}`);
        processDependencyResources(resources, ui5PathMapping, isRootProject, isReusableLibrary, namespace, sourcePath);
    });
    return { ui5PathMapping, ui5VersionInfo };
}

module.exports = {
    /**
     * Create a mapping function based on the paths of ui5 project.
     * @param {object} options The options object including the path to the ui5 project config file.
     * @returns {Promise<(function(*): string)|*>} A Promise that resolves with the mapping function.
     */
    initUi5MappingStrategy: async function (options) {
        if (pathMappingFn && !options.force) {
            return { pathMappingFn, ui5VersionInfo: ui5VersionCache };
        }

        const { graphFromPackageDependencies } = await import('@ui5/project/graph');
        const buildGraphOptions = {
            cwd: process.cwd(),
            rootConfigPath: options.configPath
        };
        const graph = await graphFromPackageDependencies(buildGraphOptions);
        const rootProject = graph.getRoot();

        let { ui5PathMapping, ui5VersionInfo } = await getFileMapFromUI5(graph, rootProject);
        ui5VersionCache = ui5VersionInfo;
        pathMappingFn = (path) => {
            let targetPath = ui5PathMapping[path];
            if (!targetPath) {
                try {
                    targetPath = require.resolve(path, {
                        paths: [process.cwd()]
                    });
                } catch (e) {
                    targetPath = path;
                }
            }
            return targetPath;
        };

        return { pathMappingFn, ui5VersionInfo };
    }
};
