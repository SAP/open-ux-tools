import baseConfig from '../../jest.base.mjs';
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
     '@sap-devx/yeoman-ui-types': '<rootDir>/node_modules/@sap-devx/yeoman-ui-types/dist/cjs/src/index.js',
    '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/vscode-logging-logger.mjs'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@vscode-logging)/)'
];
export default config;
