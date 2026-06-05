import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    stories: ['../stories/*.story.tsx'],
    addons: [
        {
            name: 'storybook-addon-turbo-build',
            options: {
                optimizationLevel: 3
            }
        }
    ],
    managerEntries: [path.resolve(__dirname, './addons/register.ts')],
    staticDirs: ['./static'],
    webpackFinal: async (config) => {
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
            include: [path.resolve(__dirname, '../'), path.resolve(__dirname, '../../../packages/ui-components')]
        });
        config.resolve.extensions.push('.ts', '.tsx');
        config.resolve.extensionAlias = {
            '.js': ['.ts', '.tsx', '.js']
        };
        return config;
    },
    framework: {
        name: '@storybook/react-webpack5',
        options: {}
    }
};
