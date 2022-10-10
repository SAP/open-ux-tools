import { validateConfig } from '../../../src/base/config';
import { AbapDeployConfig } from '../../../src/types';

describe('config', () => {
    describe('validateConfig', () => {
        const validConfig: AbapDeployConfig = {
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

        test('valid config', () => {
            expect(() => validateConfig(validConfig)).not.toThrowError();
        });

        test('target missing', () => {
            const config = { app: validConfig.app } as AbapDeployConfig;
            expect(() => validateConfig(config)).toThrowError();
        });

        test('zeros added to client', () => {
            const config = { ...validConfig };
            config.target.client = '1';
            expect(validateConfig(config).target.client).toBe('001');
        });
    });
});
