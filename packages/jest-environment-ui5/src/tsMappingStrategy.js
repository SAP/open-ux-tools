let pathMappingFn = null;

module.exports = {
    initTsConfigMappingStrategy: async function (options) {
        if (!pathMappingFn) {
            let tsConfig = require(options.configPath);
            const tsConfigPaths = require('tsconfig-paths');
            const pathMatcher = tsConfigPaths.createMatchPath(options.rootFolder, tsConfig.compilerOptions.paths);
            pathMappingFn = function (pathName) {
                if (pathName.endsWith('.js')) {
                    pathName = pathName.substring(0, pathName.length - 3);
                }
                let result = pathMatcher(pathName);

                if (!result && !pathName.endsWith('.ts')) {
                    result = pathMatcher(pathName + '.ts');
                }
                if (!result && !pathName.endsWith('.tsx')) {
                    result = pathMatcher(pathName + '.tsx');
                }
                if (!result && !pathName.endsWith('.js')) {
                    result = pathMatcher(pathName + '.js');
                }
                if (!result) {
                    try {
                        result = require.resolve(pathName, { paths: [process.cwd()] });
                    } catch (e) {
                        result = '';
                    }
                }
                if (!result && !pathName.endsWith('.ts')) {
                    try {
                        result = require.resolve(pathName + '.ts', { paths: [process.cwd()] });
                    } catch (e) {
                        result = '';
                    }
                }
                if (!result && !pathName.endsWith('.tsx')) {
                    try {
                        result = require.resolve(pathName + '.tsx', { paths: [process.cwd()] });
                    } catch (e) {
                        result = '';
                    }
                }
                return result || pathName;
            };
        }
        return pathMappingFn;
    }
};
