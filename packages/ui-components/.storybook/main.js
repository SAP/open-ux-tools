const path = require('path');

module.exports = {
    core: {
        builder: 'webpack5'
    },
    stories: ['../stories/*.story.tsx'],
    addons: [
        {
            name: 'storybook-addon-turbo-build',
            options: {
                optimizationLevel: 3
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
            include: path.resolve(__dirname, '../')
        });
        config.resolve.extensions.push('.ts', '.tsx');
        return config;
    }
};
