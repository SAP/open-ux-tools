import { resolve } from 'path';
import { createWebSocketConnection } from './building-blocks';

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
    webpackFinal: async function (config) {
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
            include: [resolve(__dirname, '../'), resolve(__dirname, '../../../packages/ui-components')]
        });
        config.resolve.extensions.push('.ts', '.tsx');
        if (config.mode === 'development') {
            // Create WebSocket connection to comunicate between fpm-writer API and ui
            await createWebSocketConnection();
        }
        return config;
    },
    framework: {
        name: '@storybook/react-webpack5',
        options: {}
    }
};
