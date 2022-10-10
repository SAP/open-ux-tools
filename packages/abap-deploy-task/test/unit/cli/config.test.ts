import type { AbapDeployConfig, CliOptions } from '../../../src/types';
import { mergeConfig } from '../../../src/cli/config';

describe('mergeConfig', () => {
    const config: AbapDeployConfig = {
        app: {
            name: '~name',
            desription: '~description',
            package: '~package',
            transport: '~transport'
        },
        target: {
            url: 'http://target.example'
        }
    };
    const noOptions: CliOptions = {
        config: 'ui5.yaml'
    };

    test('no overrides', async () => {
        expect(await mergeConfig(config, noOptions)).toEqual(config);
    });

    test('some overrides', async () => {
        const overrides: Partial<CliOptions> = {
            name: '~new-name',
            desription: '~new-description',
            package: '~new-package',
            transport: '~new-transport'
        };
        expect((await mergeConfig(config, { ...noOptions, ...overrides })).app).toEqual(overrides);
    });
});
