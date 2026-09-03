import baseConfig from '../../jest.base.mjs';
export default {
    ...baseConfig,
    // coverageProvider: 'v8' overrides jest.base default ('babel'); collectCoverage: true is inherited from jest.base
    coverageProvider: 'v8',
    setupFiles: ['<rootDir>/test/global-setup.ts'],
    resolver: '<rootDir>/jest.resolver.cjs',
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        // Mock synckit to prevent worker thread deadlock in Jest ESM mode.
        // createSyncFn spawns worker threads that use SharedArrayBuffer + Atomics.wait()
        // which deadlocks under Jest's --experimental-vm-modules.
        '^synckit$': '<rootDir>/test/__mocks__/synckit.cjs'
    },
    transform: {
        // Patch @babel/eslint-parser's index.js (see transformer header for rationale).
        // This rule must come before ts-jest's default `^.+\\.[jt]s$` so it wins for the
        // matched path; Jest applies the first matching transform.
        '@babel[\\\\/]eslint-parser[\\\\/]lib[\\\\/]index\\.js$':
            '<rootDir>/test/babel-eslint-parser.transformer.cjs',
        ...baseConfig.transform
    },
    transformIgnorePatterns: [
        // Override jest.base's pattern to additionally allow @babel/eslint-parser through
        // the transform pipeline so our patcher above runs on it.
        'node_modules/(?!(?:.*?/)?(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@sap-devx[+/]yeoman-ui-types|@babel[+/]eslint-parser)/)'
    ],
    coveragePathIgnorePatterns: [
        'src/types.ts',
        'src/language/annotations/types.ts',
        'src/language/json/types.ts',
        'src/language/xml/types.ts'
    ]
};
