import baseConfig from '../../jest.base.mjs';
export default {
    ...baseConfig,
    setupFiles: [...(baseConfig.setupFiles || []), '<rootDir>/jest.setup.mjs'],
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^vscode$': '<rootDir>/test/__mocks__/vscode.ts'
    }
};
