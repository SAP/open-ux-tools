let pathMappingFn = null;

/**
 * Retrieves the file map function from the UI5 project based on tsconfig.
 * @param {Function} pathMatcher The tsconfig paths path matcher
 * @returns {function(*): *} The path mapping function.
 */
function getPathMappingFn(pathMatcher) {
    return function (pathName) {
        if (pathName.endsWith('.js')) {
            pathName = pathName.substring(0, pathName.length - 3);
        }
        let result = '';
        const potentialExtension = ['', '.ts', '.tsx', '.js'];
        for (const extension of potentialExtension) {
            if (!result && (!extension || !pathName.endsWith(extension))) {
                result = pathMatcher(pathName + extension);
            }
        }
        for (const extension of potentialExtension) {
            if (!result && (!extension || !pathName.endsWith(extension))) {
                try {
                    result = require.resolve(pathName + extension, { paths: [process.cwd()] });
                } catch (e) {
                    result = '';
                }
            }
        }
        return result || pathName;
    };
}
module.exports = {
    /**
     * Create a mapping function based on the paths of tsconfig.
     * @param {object} options The options object including the path to the tsconfig file and the root folder.
     * @returns {Promise<(function(*): string)|*>} A Promise that resolves with the mapping function.
     */
    initTsConfigMappingStrategy: async function (options) {
        if (!pathMappingFn) {
            let tsConfig = require(options.configPath);
            const tsConfigPaths = require('tsconfig-paths');
            const pathMatcher = tsConfigPaths.createMatchPath(options.rootFolder, tsConfig.compilerOptions.paths);
            pathMappingFn = getPathMappingFn(pathMatcher);
        }
        return pathMappingFn;
    }
};
