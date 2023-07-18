import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { addGenerateAdaptationProjectCommand } from '../../../../src/cli/generate/adaptation-project';
import * as adpWriter from '@sap-ux/adp-tooling';
import * as prompts from 'prompts';
import * as logger from '../../../../src/tracing/logger';
import * as childProcess from 'child_process';
import { join } from 'path';

jest.mock('child_process');
jest.mock('prompts');

describe('generate adaptation-project', () => {
    const appRoot = join(__dirname, '../../../fixtures');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let spawnSpy: jest.SpyInstance;

    const getArgv = (arg: string[]) => ['', '', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock setup
        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(logger, 'getLogger').mockImplementation(() => loggerMock);
        fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        jest.spyOn(adpWriter, 'generate').mockResolvedValue(fsMock);
        spawnSpy = jest.spyOn(childProcess, 'spawnSync');
    });

    test('<appRoot> --url', async () => {
        const promptSpy = jest.spyOn(prompts, 'prompt');
        // Test execution
        const command = new Command('generate');
        addGenerateAdaptationProjectCommand(command);
        await command.parseAsync(getArgv(['adaptation-project', appRoot, '--url', 'http://sap.example']));

        // Result check
        expect(fsMock.commit).toBeCalled();
        expect(promptSpy).toBeCalled();
        expect(spawnSpy).toBeCalledWith(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['install'], {
            cwd: appRoot,
            stdio: [0, 1, 2]
        });
    });

    test('<appRoot> --id --reference --url', async () => {
        // Test execution
        const command = new Command('generate');
        addGenerateAdaptationProjectCommand(command);
        await command.parseAsync(
            getArgv([
                'adaptation-project',
                appRoot,
                '--id',
                'my.id',
                '--reference',
                'my.reference',
                '--url',
                'http://sap.example'
            ])
        );

        // Result check
        expect(fsMock.commit).toBeCalled();
        expect(spawnSpy).toBeCalledWith(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['install'], {
            cwd: appRoot,
            stdio: [0, 1, 2]
        });
    });
});
