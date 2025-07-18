import type { ToolsLogger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import * as adp from '@sap-ux/adp-tooling';
import * as tracer from '../../../../src/tracing/trace';
import * as common from '../../../../src/common';
import * as validations from '../../../../src/validation/validation';
import * as logger from '../../../../src/tracing/logger';
import { addComponentUsagesCommand } from '../../../../src/cli/add/component-usages';
import { Command } from 'commander';
import { join } from 'path';
import { readFileSync } from 'fs';

jest.mock('@sap-ux/adp-tooling');

const descriptorVariant = JSON.parse(
    readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
);

describe('add/component-usages', () => {
    let loggerMock: ToolsLogger;
    const memFsEditorMock = {
        create: jest.fn().mockReturnValue({
            commit: jest.fn().mockImplementation((cb) => cb())
        })
    };
    const traceSpy = jest.spyOn(tracer, 'traceChanges');
    const generateChangeSpy = jest
        .spyOn(adp, 'generateChange')
        .mockResolvedValue(memFsEditorMock as Partial<Editor> as Editor);
    const getArgv = (...arg: string[]) => ['', '', 'component-usages', ...arg];
    const mockAnswers = {
        id: 'customer.test',
        name: 'test.name',
        isLazy: 'true',
        data: '"key1": "value1"',
        settings: '"key2": "value2"',
        shouldAddLibrary: true,
        library: 'customer.library',
        libraryIsLazy: 'true'
    };
    const promptYUIQuestionsSpy = jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(mockAnswers);
    jest.spyOn(validations, 'validateAdpProject').mockResolvedValue(undefined);
    jest.spyOn(adp, 'getPromptsForAddComponentUsages').mockImplementation(() => []);

    const appRoot = join(__dirname, '../../../fixtures');

    beforeEach(() => {
        jest.clearAllMocks();
        loggerMock = {
            debug: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(logger, 'getLogger').mockImplementation(() => loggerMock);
        jest.spyOn(adp, 'getVariant').mockReturnValue(descriptorVariant);
    });

    test('should result in error when executed for CF projects', async () => {
        jest.spyOn(validations, 'validateAdpProject').mockRejectedValueOnce(
            new Error('This command is not supported for CF projects.')
        );

        const command = new Command('component-usages');
        addComponentUsagesCommand(command);
        await command.parseAsync(getArgv());

        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalledWith('This command is not supported for CF projects.');
        expect(generateChangeSpy).not.toBeCalled();
    });

    test('should result in error when the project is not adaptation project', async () => {
        jest.spyOn(validations, 'validateAdpProject').mockRejectedValueOnce(
            new Error('This command can only be used for an adaptation project')
        );

        const command = new Command('component-usages');
        addComponentUsagesCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalledWith('This command can only be used for an adaptation project');
        expect(generateChangeSpy).not.toBeCalled();
    });

    test('should pass succesfully and commit changes', async () => {
        const command = new Command('component-usages');
        addComponentUsagesCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(promptYUIQuestionsSpy).toBeCalled();
        expect(generateChangeSpy).toBeCalled();
        expect(traceSpy).not.toBeCalled();
    });

    test('should not commit changes when called with simulate', async () => {
        const command = new Command('component-usages');
        addComponentUsagesCommand(command);
        await command.parseAsync(getArgv(appRoot, '--simulate'));

        expect(promptYUIQuestionsSpy).toBeCalled();
        expect(generateChangeSpy).toBeCalled();
        expect(traceSpy).toBeCalled();
    });
});
