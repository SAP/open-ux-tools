const path = require('path');
let pathMappingFn = null;
let ui5VersionCache = null;

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
        version: rootProject._config.framework.version,
        'buildTimestamp': '202412051614',
        'scmRevision': '',
        'libraries': []
    };

    await graph.traverseBreadthFirst(async ({ project: dependency }) => {
        const reader = dependency.getReader({ style: 'runtime' });
        const sourcePath = dependency.getSourcePath();
        const namespace = dependency.getNamespace();
        const isRootProject = dependency.getName() === rootProject.getName();
        ui5VersionInfo.libraries.push({
            name: dependency.getName(),
            version: dependency.getVersion(),
            buildTimestamp: '202412051614',
            scmRevision: ''
        });
        let resources = await reader.byGlob(`**/*.{ts,tsx,js,xml,properties,json}`);

        for (const resource of resources) {
            const resourcePath = resource.getPath().replace(/\/resources\/|\/test-resources\//g, '');
            const itemPath = path.join(sourcePath, resourcePath);

            let targetPath = resourcePath.replace(/\\/g, '/');
            if (targetPath.endsWith('.js')) {
                targetPath = targetPath.replace('.js', '');
                ui5PathMapping[targetPath + '.js'] = itemPath;
            }

            if (isRootProject) {
                if (targetPath.endsWith('.ts')) {
                    targetPath = targetPath.replace('.ts', '');
                    ui5PathMapping[targetPath + '.ts'] = itemPath;
                }
                if (!targetPath.startsWith(namespace)) {
                    targetPath = path.posix.join(namespace, targetPath);
                }
            }

            ui5PathMapping[targetPath] = itemPath;
        }
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
