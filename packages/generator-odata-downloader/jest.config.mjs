import baseConfig from '../../jest.base.mjs';
const config = {
    ...baseConfig,
    globals: { ...baseConfig.globals, __filename: import.meta.filename },
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
