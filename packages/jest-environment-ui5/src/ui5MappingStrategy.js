const path = require('path');
let pathMappingFn = null;

/**
 * Retrieves the file map from the UI5 project.
 * @param {object} graph  The graph object.
 * @param {object} rootProject The root project.
 * @returns {Promise<{}>} A Promise that resolves with the file map.
 */
async function getFileMapFromUI5(graph, rootProject) {
    let ui5PathMapping = {};

    await graph.traverseBreadthFirst(async ({ project: dependency }) => {
        const reader = dependency.getReader({ style: 'runtime' });
        const sourcePath = dependency.getSourcePath();
        const namespace = dependency.getNamespace();
        const isRootProject = dependency.getName() === rootProject.getName();

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
                if (!targetPath.startsWith(namespace)) {
                    targetPath = path.join(namespace, targetPath);
                }
            }

            ui5PathMapping[targetPath] = itemPath;
        }
    });
    return ui5PathMapping;
}

module.exports = {
    /**
     * Create a mapping function based on the paths of ui5 project.
     * @param {object} options The options object including the path to the ui5 project config file.
     * @returns {Promise<(function(*): string)|*>} A Promise that resolves with the mapping function.
     */
    initUi5MappingStrategy: async function (options) {
        if (pathMappingFn && !options.force) {
            return pathMappingFn;
        }

        const { graphFromPackageDependencies } = await import('@ui5/project/graph');
        const buildGraphOptions = {
            cwd: process.cwd(),
            rootConfigPath: options.configPath
        };
        const graph = await graphFromPackageDependencies(buildGraphOptions);
        const rootProject = graph.getRoot();

        let ui5PathMapping = await getFileMapFromUI5(graph, rootProject);

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

        return pathMappingFn;
    }
};
