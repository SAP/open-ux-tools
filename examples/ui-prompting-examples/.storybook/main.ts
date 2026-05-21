import path from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    stories: ['../src/*.story.tsx'],
    addons: [
        {
            name: 'storybook-addon-turbo-build',
            options: {
                optimizationLevel: 3
            }
        }
    ],
    managerEntries: [resolve(__dirname, '../src/addons/register.ts')],
    staticDirs: ['./static'],
    webpackFinal: async function (config) {
        config.module.rules.push({
            test: /\.(ts|tsx)$/,
            use: [
                {
                    loader: 'ts-loader',
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
        config.resolve.extensionAlias = {
            '.js': ['.ts', '.tsx', '.js']
        };
        if (config.mode === 'development') {
            const { createWebSocketConnection } = await import('../src/backend/connection.js');
            await createWebSocketConnection();
        }
        return config;
    },
    framework: {
        name: '@storybook/react-webpack5',
        options: {}
    }
};
