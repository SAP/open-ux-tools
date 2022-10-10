import { validateConfig } from '../../../src/base/config';
import { UrlAbapTarget } from '../../../src/types';

describe('config', () => {
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
            expect(() => validateConfig(validConfig)).not.toThrowError();
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
            expect(() => validateConfig(config)).toThrowError();
            delete (config as any).target;
            expect(() => validateConfig(config)).toThrowError();
        });

        test('zeros added to client', () => {
            const config = { app: validConfig.app, target: { ...validConfig.target } };
            config.target.client = '1';
            validateConfig(config);
            expect(config.target.client).toBe('001');
        });
    });
});
