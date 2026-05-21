import path from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'node:path';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

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
        if (config.mode === 'development') {
            // createRequire gives a CJS resolver that handles extensionless/directory imports in the backend
            require('ts-node').register({ transpileOnly: true });
            const { createWebSocketConnection } = require('../src/backend/connection');
            await createWebSocketConnection();
        }
        return config;
    },
    framework: {
        name: '@storybook/react-webpack5',
        options: {}
    }
};
