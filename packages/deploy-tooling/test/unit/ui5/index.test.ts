import { jest } from '@jest/globals';
import { LogLevel } from '@sap-ux/logger';
import type { AbapDeployConfig } from '../../../src/types';
import { mockedUi5RepoService } from '../../__mocks__';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __testdirname = dirname(fileURLToPath(import.meta.url));

const mockDotenvConfig = jest.fn();

jest.unstable_mockModule('dotenv', () => ({
    config: mockDotenvConfig
}));

const ui5TaskModule = await import('../../../src/ui5');
const ui5Task = ui5TaskModule.default;
const { task } = await import('../../../src');

describe('ui5', () => {
    const configuration: AbapDeployConfig = {
        app: {
            name: '~name',
            description: '~description',
            package: '~package',
            transport: '~transport'
        },
        target: {
            url: 'http://target.example',
            client: '001'
        },
        log: LogLevel.Debug
    };
    const projectName = '~test';
    const workspace = {
        byGlob: jest.fn().mockReturnValue(
            readdirSync(join(__testdirname, '../../fixtures/simple-app/webapp')).map((file) => ({
                getPath: () => `/resources/${projectName}/${file}`,
                getBuffer: () => Promise.resolve(Buffer.from(''))
            }))
        )
    };
    const options = { projectName, configuration };

    test('no errors', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        await task({ workspace, options } as any);
        expect(mockDotenvConfig).toHaveBeenCalledTimes(1);
    });

    test('verify correct export', () => {
        expect(ui5Task).toBe(task);
    });

    test('lowercase package in configuration is normalized to uppercase', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        const configWithLowercase: AbapDeployConfig = {
            ...configuration,
            app: { ...configuration.app, package: '$tmp' }
        };
        await task({ workspace, options: { projectName, configuration: configWithLowercase } } as any);
        expect(configWithLowercase.app.package).toBe('$TMP');
    });

    test('string log level "verbose" in configuration does not throw', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        const configWithStringLog = { ...configuration, log: 'verbose' as unknown as LogLevel };
        await expect(
            task({ workspace, options: { projectName, configuration: configWithStringLog } } as any)
        ).resolves.not.toThrow();
    });

    test('string log level "debug" in configuration does not throw', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        const configWithStringLog = { ...configuration, log: 'debug' as unknown as LogLevel };
        await expect(
            task({ workspace, options: { projectName, configuration: configWithStringLog } } as any)
        ).resolves.not.toThrow();
    });

    test('unrecognised string log level falls back to Info without throwing', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        const configWithStringLog = { ...configuration, log: 'unknown' as unknown as LogLevel };
        await expect(
            task({ workspace, options: { projectName, configuration: configWithStringLog } } as any)
        ).resolves.not.toThrow();
    });
});
