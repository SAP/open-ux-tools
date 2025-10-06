import { LogLevel } from '@sap-ux/logger';
import type { AbapDeployConfig } from '../../../src/types';
import ui5Task from '../../../src/ui5';
import { task } from '../../../src';
import { mockedUi5RepoService } from '../../__mocks__';
import { config } from 'dotenv';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('dotenv');

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
            readdirSync(join(__dirname, '../../fixtures/simple-app/webapp')).map((file) => ({
                getPath: () => `/resources/${projectName}/${file}`,
                getBuffer: () => Promise.resolve(Buffer.from(''))
            }))
        )
    };
    const options = { projectName, configuration };

    test('no errors', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        await task({ workspace, options } as any);
        expect(config).toHaveBeenCalledTimes(1);
    });

    test('verify correct export', () => {
        expect(ui5Task).toBe(task);
    });
});
