import baseConfig from '../../jest.base.mjs';

const config = {
    ...baseConfig,
    // chalk 5.x is pure ESM; whitelist it so ts-jest transforms it to CJS for Jest
    transformIgnorePatterns: [
        'node_modules/(?!(?:.*?/)?(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|chalk|@sap-devx[+/]yeoman-ui-types)/)'
    ]
};

export default config;
