import { readFileSync } from 'fs';
import { join } from 'path';
import { getDeploymentConfig, mergeConfig } from '../../../src/cli/config';
import type { AbapDeployConfig, CliOptions } from '../../../src/types';

describe('cli/config', () => {
    describe('getDeploymentConfig', () => {
        test('valid config path', () => {
            const getConfigPromise = getDeploymentConfig(join(__dirname, '../../test-input/ui5-deploy.yaml'));
            expect(getConfigPromise).resolves.toBeDefined();
        });
        test('invalid config', () => {
            const getConfigPromise = getDeploymentConfig(join(__dirname, '../../test-input/ui5.yaml'));
            expect(getConfigPromise).rejects.toThrowError();
        });
        test('invalid path', () => {
            const getConfigPromise = getDeploymentConfig(join(__dirname, '../../test-input/ui5-invalid.yaml'));
            expect(getConfigPromise).rejects.toThrowError();
        });
    });

    describe('mergeConfig', () => {
        const config: AbapDeployConfig = {
            app: {
                name: '~name',
                description: '~description',
                package: '~package',
                transport: '~transport'
            },
            target: {
                url: 'http://target.example'
            }
        };

        test('no overrides', async () => {
            expect(await mergeConfig(config, {})).toEqual(config);
        });

        test('some overrides', async () => {
            const appOverrides: Partial<CliOptions> = {
                name: '~new-name',
                description: '~new-description',
                package: '~new-package',
                transport: '~new-transport'
            };
            const targetOverrides: Partial<CliOptions> = {
                url: 'https://secure.target.example',
                client: '001'
            };
            const merged = await mergeConfig(config, { ...appOverrides, ...targetOverrides });
            expect(merged.app).toEqual(appOverrides);
            expect(merged.target).toEqual(targetOverrides);
        });

        test('query params are parsed and added', async () => {
            expect(
                await (
                    await mergeConfig(config, { queryParams: 'hello=world&optional=false' })
                ).target.params
            ).toEqual({
                hello: 'world',
                optional: 'false'
            });
        });

        test('service keys merged correctly', async () => {
            const cloudServiceKey = join(__dirname, '../../test-input/service-keys.json');
            const merged = await mergeConfig(config, {
                cloud: true,
                cloudServiceKey
            });
            expect(merged.target.serviceKey).toEqual(JSON.parse(readFileSync(cloudServiceKey, 'utf-8')));
        });
    });
});
