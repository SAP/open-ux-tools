const path = require('path');

module.exports = {
    stories: ['../stories/*.story.tsx'],
    addons: [
        {
            name: 'storybook-addon-turbo-build',
            options: {
                optimizationLevel: 3
            }
        },
        './addons/register.ts'
    ],
    staticDirs: ['./static'],
    webpackFinal: async (config) => {
        config.module.rules.push({
            test: /\.(ts|tsx)$/,
            use: [
                {
                    loader: require.resolve('ts-loader'),
                    options: {
                        configFile: 'tsconfig.json',
                        transpileOnly: true
                    }
                }
            ]
        });
        config.module.rules.push({
            test: /\.scss$/,
            use: [
                'style-loader',
                {
                    loader: 'css-loader',
                    options: {
                        esModule: false
                    }
                },
                'sass-loader'
            ],
            include: [path.resolve(__dirname, '../'), path.resolve(__dirname, '../../../packages/ui-components')]
        });
        config.resolve.extensions.push('.ts', '.tsx');
        return config;
    },
    framework: {
        name: '@storybook/react-webpack5',
        options: {}
    }
};
