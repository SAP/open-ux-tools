import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/templates');
config.moduleNameMapper = {
    ...config.moduleNameMapper,
    // Mock @sap/ux-cds-compiler-facade (CJS) to avoid its require() of ESM workspace packages
    // (odata-annotation-core-types, odata-annotation-core, project-access)
    '^@sap/ux-cds-compiler-facade$': '<rootDir>/test/__mocks__/ux-cds-compiler-facade.mjs',
    // Mock @sap-ux/project-access/dist/file to avoid read-only ESM module namespace
    // issue with jest.spyOn (findFilesByExtension)
    '^@sap-ux/project-access/dist/file$': '<rootDir>/test/__mocks__/project-access-file.mjs'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@vscode-logging)/)'
];
export default config;