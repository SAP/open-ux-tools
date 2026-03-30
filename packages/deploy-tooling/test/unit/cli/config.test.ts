import type { AbapDeployConfig, CliOptions } from '../../../src/types';
import { getDeploymentConfig, mergeConfig } from '../../../src/cli/config';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import ProcessEnv = NodeJS.ProcessEnv;

describe('cli/config', () => {
    let env: ProcessEnv;

    beforeAll(() => {
        env = process.env;
    });

    afterAll(() => {
        process.env = env;
    });

    describe('getDeploymentConfig', () => {
        const fixture = join(__dirname, '../../fixtures/simple-app');
        test('valid config path', async () => {
            expect(await getDeploymentConfig(join(fixture, 'ui5-deploy.yaml'))).toBeDefined();
        });
        test('invalid config', async () => {
            await expect(getDeploymentConfig(join(fixture, 'ui5.yaml'))).rejects.toThrow();
        });
        test('invalid path', async () => {
            await expect(getDeploymentConfig(join(fixture, 'ui5-invalid.yaml'))).rejects.toThrow();
        });
    });

    describe('mergeConfig', () => {
        const config: AbapDeployConfig = {
            app: {
                name: '~name',
                description: '~description',
                package: '~PACKAGE',
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
            expect(merged.app).toEqual({ ...appOverrides, package: '~NEW-PACKAGE' });
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
            const cloudServiceKey = join(__dirname, '../../fixtures/service-keys.json');
            const merged = await mergeConfig(config, {
                cloud: true,
                cloudServiceKey
            } as CliOptions);
            expect(merged.target.serviceKey).toEqual(JSON.parse(readFileSync(cloudServiceKey, 'utf-8')));
        });

        test('validate reading of environment variables supporting UAA', async () => {
            process.env.SERVICE_URL = 'http://service-url';
            process.env.SERVICE_UAA_URL = 'http://uaa-url';
            process.env.SERVICE_CLIENT_ID = 'MyClientId';
            process.env.SERVICE_CLIENT_SECRET = 'MyClientPassword';
            process.env.SERVICE_SYSTEM_ID = 'Y11';
            process.env.SERVICE_USERNAME = 'MyUsername';
            process.env.SERVICE_PASSWORD = 'MyPassword';
            process.env.NO_RETRY = 'true';
            const merged = await mergeConfig(config, {
                cloud: true,
                cloudServiceEnv: true
            } as CliOptions);
            expect(merged.retry).toEqual(false);
            expect(merged.target.serviceKey).toMatchObject({
                systemid: 'Y11',
                uaa: {
                    clientid: 'MyClientId',
                    clientsecret: 'MyClientPassword',
                    password: 'MyPassword',
                    url: 'http://uaa-url',
                    username: 'MyUsername'
                },
                url: config.target.url
            });
        });

        test('Validate merging credentials using config and cli options', async () => {
            const merged = await mergeConfig(
                { ...config, credentials: { username: '~ShouldBeRemoved', password: '~ShouldBeRemoved' } },
                {
                    username: '~MyUsername',
                    password: '~MyPassword'
                } as CliOptions
            );
            expect(merged.credentials).toMatchObject({
                username: '~MyUsername',
                password: '~MyPassword'
            });
        });

        test('Validate credentials using only cli options', async () => {
            const merged = await mergeConfig(config, {
                username: 'env:DotEnvMyUsername',
                password: 'env:DotEnvMyPassword'
            } as CliOptions);
            expect(merged.credentials).toMatchObject({
                username: 'env:DotEnvMyUsername',
                password: 'env:DotEnvMyPassword'
            });
        });
    });

    describe('mergeConfig package name normalization', () => {
        const baseConfig: AbapDeployConfig = {
            app: { name: 'ZAPP', description: '', package: '', transport: '' },
            target: { url: 'http://target.example' }
        };

        test('normalizes $tmp to $TMP and warns', async () => {
            const logger = new ToolsLogger({ transports: [new NullTransport()] });
            const warnSpy = jest.spyOn(logger, 'warn');
            const merged = await mergeConfig(
                { ...baseConfig, app: { ...baseConfig.app, package: '$tmp' } },
                {},
                logger
            );
            expect(merged.app.package).toBe('$TMP');
            expect(warnSpy).toHaveBeenCalledWith(
                "Package name '$tmp' was normalized to '$TMP'. Lowercase package names may cause deployment failures."
            );
        });

        test('normalizes mixed-case $Tmp to $TMP and warns', async () => {
            const logger = new ToolsLogger({ transports: [new NullTransport()] });
            const warnSpy = jest.spyOn(logger, 'warn');
            const merged = await mergeConfig(
                { ...baseConfig, app: { ...baseConfig.app, package: '$Tmp' } },
                {},
                logger
            );
            expect(merged.app.package).toBe('$TMP');
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        test('normalizes lowercase package name and warns', async () => {
            const logger = new ToolsLogger({ transports: [new NullTransport()] });
            const warnSpy = jest.spyOn(logger, 'warn');
            const merged = await mergeConfig(
                { ...baseConfig, app: { ...baseConfig.app, package: 'zmypackage' } },
                {},
                logger
            );
            expect(merged.app.package).toBe('ZMYPACKAGE');
            expect(warnSpy).toHaveBeenCalledWith(
                "Package name 'zmypackage' was normalized to 'ZMYPACKAGE'. Lowercase package names may cause deployment failures."
            );
        });

        test('normalizes mixed-case package name and warns', async () => {
            const logger = new ToolsLogger({ transports: [new NullTransport()] });
            const warnSpy = jest.spyOn(logger, 'warn');
            const merged = await mergeConfig(
                { ...baseConfig, app: { ...baseConfig.app, package: 'ZMyPackage' } },
                {},
                logger
            );
            expect(merged.app.package).toBe('ZMYPACKAGE');
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        test('does not warn when package is already uppercase', async () => {
            const logger = new ToolsLogger({ transports: [new NullTransport()] });
            const warnSpy = jest.spyOn(logger, 'warn');
            const merged = await mergeConfig(
                { ...baseConfig, app: { ...baseConfig.app, package: '$TMP' } },
                {},
                logger
            );
            expect(merged.app.package).toBe('$TMP');
            expect(warnSpy).not.toHaveBeenCalled();
        });

        test('does not warn when package is already fully uppercase', async () => {
            const logger = new ToolsLogger({ transports: [new NullTransport()] });
            const warnSpy = jest.spyOn(logger, 'warn');
            const merged = await mergeConfig(
                { ...baseConfig, app: { ...baseConfig.app, package: 'ZMYPACKAGE' } },
                {},
                logger
            );
            expect(merged.app.package).toBe('ZMYPACKAGE');
            expect(warnSpy).not.toHaveBeenCalled();
        });

        test('normalizes package from CLI option', async () => {
            const logger = new ToolsLogger({ transports: [new NullTransport()] });
            const warnSpy = jest.spyOn(logger, 'warn');
            const merged = await mergeConfig(baseConfig, { package: '$tmp' } as CliOptions, logger);
            expect(merged.app.package).toBe('$TMP');
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        test('works without a logger (no crash)', async () => {
            const merged = await mergeConfig({ ...baseConfig, app: { ...baseConfig.app, package: '$tmp' } }, {});
            expect(merged.app.package).toBe('$TMP');
        });
    });
});
