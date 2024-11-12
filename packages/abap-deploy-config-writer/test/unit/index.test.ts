import { join } from 'path';
import { generate } from '../../src';
import fsExtra from 'fs-extra';
import type { AbapDeployConfig, BspApp } from '@sap-ux/ui5-config';
import type { DeployConfigOptions } from '../../src/types';

describe('generate', () => {
    const outputDir = join(__dirname, '../test-output');
    const debug = !!process.env['UX_DEBUG'];

    beforeAll(async () => {
        fsExtra.removeSync(outputDir);
    });

    const config: AbapDeployConfig = {
        target: { url: 'https://example.com', client: '000', scp: false },
        app: { name: '', package: 'TESTPKG12', description: 'Mock deployment description', transport: 'TR123' }
    };

    const testConfigs: Array<{
        name: string;
        config: AbapDeployConfig;
        options?: DeployConfigOptions;
        isAppStudio: boolean;
    }> = [
        {
            name: 'test-js-app',
            config: {
                ...config,
                target: {
                    ...config.target,
                    url: 'https://example-api.com',
                    authenticationType: 'reentranceTicket'
                }
            },
            isAppStudio: false
        },
        {
            name: 'test-ts-app',
            config: {
                ...config,
                target: {
                    ...config.target,
                    destination: 'MOCK_DESTINATION',
                    scp: true
                }
            },
            isAppStudio: true
        },
        {
            name: 'test.ui5.lib',
            config,
            options: {
                baseFile: 'base-config.yaml',
                deployFile: 'deploy-config.yaml'
            },
            isAppStudio: false
        }
    ];

    test.each(testConfigs)('Generate deployment configs: $name', async ({ name, options, config, isAppStudio }) => {
        (config.app as BspApp).name = name;
        const testPath = join(outputDir, name);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(testPath);
        fsExtra.copySync(join(__dirname, `../sample/${name}`), testPath);

        const fs = await generate(testPath, config, options);
        expect(fs.dump(testPath)).toMatchSnapshot();

        return new Promise((resolve) => {
            if (debug) {
                fs.commit(resolve);
            } else {
                fsExtra.removeSync(testPath);
                resolve(true);
            }
        });
    });
});
