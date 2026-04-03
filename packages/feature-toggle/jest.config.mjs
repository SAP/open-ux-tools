import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^vscode$': '<rootDir>/test/__mocks__/vscode.js'
    }
};
