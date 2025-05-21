import { resolve } from 'path';
import { createWebSocketConnection } from '../src/backend';

module.exports = {
    stories: ['../src/*.story.tsx'],
    addons: [
        {
            name: 'storybook-addon-turbo-build',
            options: {
                optimizationLevel: 3
            }
        },
        '../src/addons/register.ts'
    ],
    staticDirs: ['./static'],
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
            include: [
                resolve(__dirname, '../../../packages/ui-components'),
                resolve(__dirname, '../../../packages/ui-prompting')
            ]
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
