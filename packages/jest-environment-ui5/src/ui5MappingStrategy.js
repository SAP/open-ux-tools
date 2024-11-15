const path = require('path');
let pathMappingFn = null;

module.exports = {
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
