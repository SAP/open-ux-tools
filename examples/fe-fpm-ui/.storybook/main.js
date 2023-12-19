const path = require('path');
const WebSocket = require('ws');
const fpmWriter = require('@sap-ux/fe-fpm-writer');
const util = require('util');
const memFs = require('mem-fs');
const memFsEditor = require('mem-fs-editor');

const sampleAppPath = path.join(__dirname, '../../fe-fpm-cli/sample/fe-app');
const testAppPath = path.join(__dirname, '../../fe-fpm-cli/test-output/fe-app', `${Date.now()}`);

/**
 * Initializes the memfs and copies over the sample Fiori elements application.
 *
 * @returns {Promise<Editor>} the memfs editor object
 */
async function initialize() {
    const fs = memFsEditor.create(memFs.create());

    fs.copy([path.join(sampleAppPath)], path.join(testAppPath));

    await util.promisify(fs.commit).call(fs);
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
            include: [path.resolve(__dirname, '../'), path.resolve(__dirname, '../../../packages/ui-components')]
        });
        config.resolve.extensions.push('.ts', '.tsx');
        const wss = new WebSocket.Server({ port: 8080 });

        // Listen for WebSocket connections
        wss.on('connection', async (ws) => {
            console.log('WebSocket connected');

            // Send a message from main.js to the preview when connected
            let fs = await initialize();
            const prompts = await fpmWriter.getTableBuildingBlockPrompts(testAppPath, fs)
            // Post processing
            const action = { type: 'update', data: prompts };
            ws.send(JSON.stringify(action));

            // Handle messages received from the preview
            ws.on('message', (message) => {
                console.log(`Received message from the preview: ${message}`);
            });
        });

        return config;
    },
    framework: {
        name: '@storybook/react-webpack5',
        options: {}
    }
};
