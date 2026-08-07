import baseConfig from '../../jest.base.mjs';
import { resolve } from 'node:path';
const __dirname = import.meta.dirname;

const config = {
    ...baseConfig,
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^@ui5/task-adaptation/dist/index\\.js$': resolve(__dirname, '../adp-tooling/node_modules/@ui5/task-adaptation/dist/index.js')
    }
};

config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/.tmp');
config.testMatch = ['<rootDir>/test/**/*.test.ts'];

export default config;
