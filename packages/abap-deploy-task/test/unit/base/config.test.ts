import { getConfigForLogging, isUrlTarget, replaceEnvVariables, validateConfig } from '../../../src/base/config';
import type { AbapDeployConfig, UrlAbapTarget } from '../../../src/types';

import { isAppStudio } from '@sap-ux/btp-utils';
jest.mock('@sap-ux/btp-utils');
const mockIsAppStudio = isAppStudio as jest.Mock;

describe('base/config', () => {
    test('isUrlTarget', () => {
        expect(isUrlTarget({ url: '~url' })).toBe(true);
        expect(isUrlTarget({ destination: '~destination' })).toBe(false);
    });

    describe('replaceEnvVariables', () => {
        const envVal = '~testvalue';
        const envRef = 'env:TEST_VAR';

        process.env.TEST_VAR = envVal;
        test('top level', () => {
            const config = { hello: envRef };
            replaceEnvVariables(config);
            expect(config.hello).toBe(envVal);
        });
        test('in array', () => {
            const config = ['hello', envRef];
            replaceEnvVariables(config);
            expect(config[1]).toBe(envVal);
        });
        test('nested', () => {
            const config = { hello: { world: envRef }, world: envRef };
            replaceEnvVariables(config);
            expect(config.hello.world).toBe(envVal);
            expect(config.world).toBe(envVal);
        });
    });

    describe('getConfigForLogging', () => {
        test('no credentials included', () => {
            const config = {
                app: {
                    name: 'world'
                }
            } as AbapDeployConfig;
            const configForLogging = getConfigForLogging(config);
            expect(configForLogging).toBe(config);
        });
        test('credentials are being removed', () => {
            const config = {
                app: {
                    name: 'world'
                },
                credentials: {
                    username: '~user',
                    password: '~password'
                }
            } as AbapDeployConfig;
            const configForLogging = getConfigForLogging(config);
            expect(configForLogging.credentials).toBe('hidden');
            expect(configForLogging.app.name).toBe(config.app.name);
        });
    });

    describe('validateConfig', () => {
        const validConfig = {
            app: {
                name: '~name',
                desription: '~description',
                package: '~package',
                transport: '~transport'
            },
            target: {
                url: 'http://target.example'
            } as UrlAbapTarget
        };

        test('valid config', () => {
            mockIsAppStudio.mockReturnValueOnce(false);
            expect(() => validateConfig(validConfig)).not.toThrowError();
            mockIsAppStudio.mockReturnValueOnce(true);
            expect(() => validateConfig({ app: validConfig.app, target: { destination: '~dest' } })).not.toThrowError();
        });

        test('config missing', () => {
            expect(() => validateConfig(undefined)).toThrowError();
        });

        test('incorrect app', () => {
            const config = { app: { ...validConfig.app }, target: validConfig.target };
            delete (config.app as any).name;
            expect(() => validateConfig(config)).toThrowError();
            delete (config as any).app;
            expect(() => validateConfig(config)).toThrowError();
        });

        test('incorrect target', () => {
            const config = { app: validConfig.app, target: { ...validConfig.target } };
            delete (config.target as any).url;
            mockIsAppStudio.mockReturnValueOnce(false);
            expect(() => validateConfig(config)).toThrowError('target-url');
            mockIsAppStudio.mockReturnValueOnce(true);
            expect(() => validateConfig(config)).toThrowError('target-destination');
            delete (config as any).target;
            expect(() => validateConfig(config)).toThrowError('target');
        });

        test('zeros added to client', () => {
            const config = { app: validConfig.app, target: { ...validConfig.target } };
            config.target.client = '1';
            validateConfig(config);
            expect(config.target.client).toBe('001');
        });
    });
});
