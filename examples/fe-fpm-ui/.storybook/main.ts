import { join, resolve } from 'path';
import {
    getTableBuildingBlockPrompts,
    getChartBuildingBlockPrompts,
    getFilterBarBuildingBlockPrompts
} from '@sap-ux/fe-fpm-writer';
import { promisify } from 'util';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { Server } from 'ws';
import type { Data } from 'ws';

const sampleAppPath = join(__dirname, '../../fe-fpm-cli/sample/fe-app');
const testAppPath = join(__dirname, '../../fe-fpm-cli/test-output/fe-app', `${Date.now()}`);

/**
 * Initializes the memfs and copies over the sample Fiori elements application.
 *
 * @returns {Promise<Editor>} the memfs editor object
 */
async function initialize(): Promise<Editor> {
    const fs = create(createStorage());

    fs.copy([join(sampleAppPath)], join(testAppPath));

    await promisify(fs.commit).call(fs);
    return fs;
}

module.exports = {
    stories: ['../stories/*.story.tsx'],
    addons: [
        {
            name: 'storybook-addon-turbo-build',
            options: {
                optimizationLevel: 3
            }
        }
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
        const wss = new Server({ port: 8080 });

        // Listen for WebSocket connections
        wss.on('connection', async (ws) => {
            console.log('WebSocket connected');

            // Send a message from main.js to the preview when connected
            let fs = await initialize();
            // Handle messages received from the preview
            ws.on('message', async (message: Data) => {
                console.log(`Received message from the preview test: ${message}`);
                if (typeof message !== 'string') {
                    return;
                }
                const action = JSON.parse(message);
                if (action.type === 'GET_QUESTIONS') {
                    if (action.value === 'table') {
                        const prompts = await getTableBuildingBlockPrompts(testAppPath, fs);
                        // Post processing
                        const action = { type: 'SET_TABLE_QUESTIONS', data: prompts };
                        ws.send(JSON.stringify(action));
                    } else if (action.value === 'chart') {
                        const prompts = await getChartBuildingBlockPrompts(testAppPath, fs);
                        // Post processing
                        const action = { type: 'SET_CHART_QUESTIONS', data: prompts };
                        ws.send(JSON.stringify(action));
                    } else if (action.value === 'filterBar') {
                        const prompts = await getFilterBarBuildingBlockPrompts(testAppPath, fs);
                        // Post processing
                        const action = { type: 'SET_FILTERBAR_QUESTIONS', data: prompts };
                        ws.send(JSON.stringify(action));
                    }
                }
            });
        });

        return config;
    },
    framework: {
        name: '@storybook/react-webpack5',
        options: {}
    }
};
