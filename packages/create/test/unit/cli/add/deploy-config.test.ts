import type { Editor } from 'mem-fs-editor';
import { addDeployConfigCommand } from '../../../../src/cli/add/deploy-config';
import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { join } from 'path';
import * as logger from '../../../../src/tracing/logger';
import * as deployConfigInquirer from '@sap-ux/abap-deploy-config-inquirer';
import * as deployConfigWriter from '@sap-ux/abap-deploy-config-writer';

describe('add/deploy-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');

    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;

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
        logLevelSpy = jest.spyOn(logger, 'setLogLevelVerbose').mockImplementation(() => undefined);
        fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
    });

    test('should add deploy config', async () => {
        jest.spyOn(deployConfigInquirer, 'prompt').mockResolvedValueOnce({});
        jest.spyOn(deployConfigWriter, 'generate').mockResolvedValueOnce(fsMock);

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot]));

        // Result check
        expect(logLevelSpy).not.toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('should add deploy config --simulate', async () => {
        jest.spyOn(deployConfigInquirer, 'prompt').mockResolvedValueOnce({});
        jest.spyOn(deployConfigWriter, 'generate').mockResolvedValueOnce(fsMock);

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--simulate']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).not.toBeCalled();
    });

    test('should add deploy config --verbose', async () => {
        jest.spyOn(deployConfigInquirer, 'prompt').mockResolvedValueOnce({});
        jest.spyOn(deployConfigWriter, 'generate').mockResolvedValueOnce(fsMock);

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--verbose']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
        expect(fsMock.commit).toBeCalled();
    });

    test('should report error', async () => {
        const errorObj = new Error('Error generating deployment configuration');

        jest.spyOn(deployConfigInquirer, 'prompt').mockResolvedValueOnce({});
        jest.spyOn(deployConfigWriter, 'generate').mockImplementationOnce(() => {
            throw errorObj;
        });

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--verbose']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).toBeCalledWith(`Error while executing add deploy-config '${errorObj.message}'`);
        expect(fsMock.commit).not.toBeCalled();
    });

    test('should add deployment config when answers are returned by prompting', async () => {
        const promptAnswers = {
            url: 'http://example.com',
            client: '100',
            scp: false,
            ui5AbapRepo: 'ZUI5_REPO',
            package: 'ZPACKAGE',
            description: 'UI5 App',
            transport: 'TRDUMMY'
        };

        jest.spyOn(deployConfigInquirer, 'prompt').mockResolvedValueOnce(promptAnswers);
        jest.spyOn(deployConfigWriter, 'generate').mockResolvedValueOnce(fsMock);

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--verbose']));

        // Result check
        expect(loggerMock.debug).toBeCalledWith(
            `Adding deployment configuration : ${JSON.stringify(
                {
                    target: {
                        url: promptAnswers.url,
                        client: promptAnswers.client,
                        scp: promptAnswers.scp
                    },
                    app: {
                        name: promptAnswers.ui5AbapRepo,
                        package: promptAnswers.package,
                        description: promptAnswers.description,
                        transport: promptAnswers.transport
                    }
                },
                null,
                2
            )}`
        );
        expect(fsMock.commit).toBeCalled();
    });
});
