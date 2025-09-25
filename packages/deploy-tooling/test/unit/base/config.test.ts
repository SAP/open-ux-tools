import { type UrlAbapTarget, isUrlTarget } from '@sap-ux/system-access';
import { getConfigForLogging, validateConfig } from '../../../src/base/config';
import type { AbapDeployConfig } from '../../../src/types';

import { isAppStudio } from '@sap-ux/btp-utils';
import type { AxiosRequestConfig } from '@sap-ux/axios-extension';

jest.mock('@sap-ux/btp-utils');
const mockIsAppStudio = isAppStudio as jest.Mock;

describe('base/config', () => {
    test('isUrlTarget', () => {
        expect(isUrlTarget({ url: '~url' })).toBe(true);
        expect(isUrlTarget({ destination: '~destination' })).toBe(false);
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
            expect(configForLogging.app).toEqual(config.app);
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
            expect(() => validateConfig(validConfig)).not.toThrow();
            mockIsAppStudio.mockReturnValueOnce(true);
            expect(() => validateConfig({ app: validConfig.app, target: { destination: '~dest' } })).not.toThrow();
        });

        test('config missing', () => {
            expect(() => validateConfig(undefined)).toThrow();
        });

        test('incorrect app', () => {
            const config = { app: { ...validConfig.app }, target: validConfig.target };
            delete (config as any).app;
            expect(() => validateConfig(config)).toThrow();
        });

        test('incorrect target', () => {
            const config = { app: validConfig.app, target: { ...validConfig.target } };
            delete (config.target as any).url;
            mockIsAppStudio.mockReturnValueOnce(false);
            expect(() => validateConfig(config)).toThrow('target-url');
            mockIsAppStudio.mockReturnValueOnce(true);
            expect(() => validateConfig(config)).toThrow('target-destination');
            delete (config as any).target;
            expect(() => validateConfig(config)).toThrow('target');
        });

        test('zeros added to client', () => {
            const config = { app: validConfig.app, target: { ...validConfig.target } };
            config.target.client = '1';
            validateConfig(config);
            expect(config.target.client).toBe('001');
        });

        test('username and password in cleartext should not be supported', () => {
            const config = {
                app: validConfig.app,
                credentials: { username: 'user', password: 'user' } as AxiosRequestConfig['auth'],
                target: { ...validConfig.target }
            };
            expect(() => validateConfig(config)).toThrowError(
                'Invalid deployment configuration. Credentials must be set as environment variables'
            );
            expect(() =>
                validateConfig({
                    ...config,
                    credentials: {
                        username: 'env:USER',
                        password: 'env:PASSWORD'
                    }
                })
            ).not.toThrowError();
        });
    });
});
