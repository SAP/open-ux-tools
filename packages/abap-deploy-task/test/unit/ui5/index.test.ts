import { LogLevel } from '@sap-ux/logger';
import { AbapDeployConfig } from '../../../src/types';
import ui5Task from '../../../src/ui5';
import { task } from '../../../src';
import { mockedUi5RepoService } from '../../__mocks__';

describe('ui5', () => {
    const configuration: AbapDeployConfig = {
        app: {
            name: '~name',
            desription: '~description',
            package: '~package',
            transport: '~transport'
        }, target: {
            url: 'http://target.example',
            client: '001'
        },
        log: LogLevel.Debug
    };
    const projectName = '~test';
    const workspace = {
        byGlob: jest.fn().mockReturnValue([{
            getPath: () => `${projectName}/~path`,
            getBuffer: () => Promise.resolve(Buffer.from(''))
        }])
    };
    const options = { projectName, configuration };

    test('no errors', async () => {
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);
        await task({ workspace, options } as any);
    });

    test('verify correct export', () => {
        expect(ui5Task).toBe(task);
    });
});