import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    displayName: 'fiori-migration-writer',
    // Override modulePathIgnorePatterns to include test/integration/ which base config excludes
    modulePathIgnorePatterns: [
        '<rootDir>/dist',
        '<rootDir>/coverage',
        '<rootDir>/templates',
        '<rootDir>/test/test-input',
        '<rootDir>/test/test-output',
        '<rootDir>/test/fixtures',
        '<rootDir>/test-output'  // Test output at package root
    ]
};
