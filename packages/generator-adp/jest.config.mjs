import baseConfig from '../../jest.base.mjs';
// The package emits CommonJS (see tsconfig.json) so the yeoman-ui-types VSCode
// extension's bundled yeoman-environment 3.x can `Object.assign` registration
// metadata onto the generator class — ESM module namespace objects are sealed
// and that fails with
// "Cannot add property resolved, object is not extensible".
//
// Tests still run as ESM (with `jest.unstable_mockModule` and top-level
// `await import()`) so we override ts-jest's tsconfig here to force
// `module: ESNext` for tests only.
const config = {
    ...baseConfig,
    transform: {
        '^.+\\.[jt]s$': [
            'ts-jest',
            {
                ...baseConfig.transform['^.+\\.[jt]s$'][1],
                tsconfig: {
                    ...baseConfig.transform['^.+\\.[jt]s$'][1].tsconfig,
                    module: 'ESNext',
                    moduleResolution: 'Bundler'
                }
            }
        ]
    }
};
config.snapshotFormat = {
    escapeString: false,
    printBasicPrototype: false
};
config.moduleNameMapper = {
    ...config.moduleNameMapper,
    '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/vscode-logging-logger.mjs'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(?:.*?/)?(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@vscode-logging|@sap-devx[+/]yeoman-ui-types)/)'
];
export default config;
