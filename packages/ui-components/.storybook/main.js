const path = require('path');
module.exports = {
    stories: ['../stories/*.story.tsx'],
    addons: [
        '@storybook/addon-essentials',
        {
            name: '@storybook/addon-styling',
            options: {
                sass: {
                    // Require your Sass preprocessor here
                    implementation: require('sass')
                }
            }
        }
    ],
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
        config.resolve.extensions.push('.ts', '.tsx');
        return config;
    },
    framework: {
        name: '@storybook/react-webpack5',
        options: {}
    },
    docs: {
        autodocs: false
    }
};
