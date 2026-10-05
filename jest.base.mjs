import { resolve } from 'node:path';
const __dirname = import.meta.dirname;

export default {
    extensionsToTreatAsEsm: ['.ts'],
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
    testEnvironment: 'node',
    setupFiles: [resolve(__dirname, 'jest.setup.mjs')],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        // Redirect ESM-only proxy-agent packages to CJS stubs. These packages
        // (agent-base@9, http-proxy-agent@9, https-proxy-agent@9, socks-proxy-agent@10)
        // ship as pure ESM, which breaks when they are imported transitively through
        // the pacote → make-fetch-happen → @npmcli/agent chain inside @ui5/project.
        // The custom resolver (jest-esm-shims/resolver.cjs) handles CJS require() calls
        // for this chain; these entries handle dynamic import() from ESM modules (e.g.
        // @ui5/project which is type:module) where the resolver is not called.
        '^agent-base$': '<rootDir>/../../jest-esm-shims/agent-base.cjs',
        '^http-proxy-agent$': '<rootDir>/../../jest-esm-shims/http-proxy-agent.cjs',
        '^https-proxy-agent$': '<rootDir>/../../jest-esm-shims/https-proxy-agent.cjs',
        '^socks-proxy-agent$': '<rootDir>/../../jest-esm-shims/socks-proxy-agent.cjs'
    },
    resolver: new URL('./jest-esm-shims/resolver.cjs', import.meta.url).pathname,
    moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
    transform: {
        '^.+\\.[jt]s$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: {
                    module: 'NodeNext',
                    moduleResolution: 'NodeNext',
                    isolatedModules: true,
                    allowJs: true
                },
                diagnostics: {
                    ignoreCodes: [151001]
                }
            }
        ]
    },
    // Allow jest.mock() to work with workspace packages in ESM mode
    // Also transform @sap/ux-cds-compiler-facade since it imports ESM workspace packages
    // Also transform @sap-devx/yeoman-ui-types since it ships untransformed ESM under .pnpm/
    // The (?:.*?/)? lazy prefix accounts for pnpm's .pnpm/<name>+<version>/node_modules/<name> layout
    transformIgnorePatterns: [
        'node_modules/(?!(?:.*?/)?(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@sap-devx[+/]yeoman-ui-types)/)'
    ],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts'],
    coverageReporters: ['text', ['lcov', { projectRoot: '../../' }]],
    reporters: [
        'default',
        [
            'jest-sonar',
            {
                reportedFilePath: 'relative',
                relativeRootDir: '<rootDir>/../../../'
            }
        ]
    ],
    modulePathIgnorePatterns: [
        '<rootDir>/dist',
        '<rootDir>/coverage',
        '<rootDir>/templates',
        '<rootDir>/test/test-input',
        '<rootDir>/test/test-output',
        '<rootDir>/test/integration'
    ],
    verbose: true,
    snapshotFormat: {
        escapeString: true,
        printBasicPrototype: true
    }
};
