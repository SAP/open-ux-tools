const config = require('../../jest.base');

module.exports = {
    ...config,
    transform: {
        ...config.transform,
        '^.+\\.m?js$': ['ts-jest', {
            tsconfig: {
                allowJs: true
            }
        }]
    },
    transformIgnorePatterns: ['<rootDir>/../../node_modules/(?!mem-fs|mem-fs-editor)'],
};
