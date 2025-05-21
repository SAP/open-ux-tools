declare namespace jestUI5 {
    /**
     * Resolves the path to the given file.
     * The path is the ui5 path and the resolved path is the path to the file in the file system.
     * This is useful when trying to call jest.mock with a ui5 path.
     * jest.mock(jestUI5.resolvePath("sap/m/Button"), () => {
     *    return jest.fn();
     * });
     *
     * @param path
     */
    function resolvePath(path: string): string;

    /**
     * Mocks a URL with the given data.
     * The data should be a string representing the target file.
     * This is useful to mock fragment or metadata files
     * @param {string} path The path to mock
     * @param {string} fileContent The content of the file
     */
    function mockUrl(path, fileContent): void;
}
