import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { Command } from 'commander';
import * as tracer from '../../../../src/tracing/trace';
import * as common from '../../../../src/common';
import * as logger from '../../../../src/tracing/logger';
import * as projectAccess from '@sap-ux/project-access';
import { join } from 'path';
import * as validations from '../../../../src/validation/validation';
import { addChangeInboundCommand } from '../../../../src/cli/change/change-inbound';
import * as adp from '@sap-ux/adp-tooling';

jest.mock('prompts');
jest.mock('@sap-ux/adp-tooling');

const cloudDescriptorVariant = JSON.parse(
    jest
        .requireActual('fs')
        .readFileSync(
            join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant.cloud'),
            'utf-8'
        )
);

describe('change/inbound', () => {
    let loggerMock: ToolsLogger;
    const memFsEditorMock = {
        create: jest.fn().mockReturnValue({
            commit: jest.fn().mockImplementation((cb) => cb())
        })
    };
    const mockAnswers = {
        title: 'Some Title',
        subtitle: 'Some Subtitle',
        icon: 'Some Icon'
    };

    const traceSpy = jest.spyOn(tracer, 'traceChanges');
    const generateChangeSpy = jest
        .spyOn(adp, 'generateChange')
        .mockResolvedValue(memFsEditorMock as Partial<Editor> as Editor);
    const promptYUIQuestionsSpy = jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(mockAnswers);
    const getArgv = (...arg: string[]) => ['', '', 'inbound', ...arg];
    const appRoot = join(__dirname, '../../../fixtures');
    jest.spyOn(validations, 'validateAdpProject').mockResolvedValue(undefined);

    beforeEach(() => {
        jest.clearAllMocks();
        loggerMock = {
            debug: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(logger, 'getLogger').mockImplementation(() => loggerMock);
        jest.spyOn(adp, 'getVariant').mockReturnValue(cloudDescriptorVariant);
        jest.spyOn(projectAccess, 'getAppType').mockResolvedValue('Fiori Adaptation');
    });

    test('change-inbound - not an Adaptation Project', async () => {
        jest.spyOn(validations, 'validateAdpProject').mockRejectedValueOnce(
            new Error('This command can only be used for an adaptation project')
        );

        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalledWith('This command can only be used for an adaptation project');
        expect(generateChangeSpy).not.toBeCalled();
    });

    test('change-inbound - CF environment', async () => {
        jest.spyOn(validations, 'validateAdpProject').mockRejectedValueOnce(
            new Error('This command is not supported for CF projects.')
        );

        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(appRoot));

        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalledWith('This command is not supported for CF projects.');
        expect(generateChangeSpy).not.toBeCalled();
    });

    test('change-inbound - onPremise project', async () => {
        jest.spyOn(validations, 'validateAdpProject').mockRejectedValueOnce(
            new Error('This command can only be used for Cloud Adaptation Project')
        );

        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(appRoot));
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.error).toBeCalledWith('This command can only be used for Cloud Adaptation Project');
        expect(generateChangeSpy).not.toBeCalled();
    });

    test('change-inbound - --simulate', async () => {
        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(appRoot, '--simulate'));
        expect(promptYUIQuestionsSpy).toBeCalled();
        expect(generateChangeSpy).toBeCalled();
        expect(traceSpy).toBeCalled();
    });

    test('change-inbound - cloudProject', async () => {
        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(appRoot));
        expect(promptYUIQuestionsSpy).toBeCalled();
        expect(generateChangeSpy).toBeCalled();
    });

    test('change-inbound - no basePath', async () => {
        const command = new Command('inbound');
        addChangeInboundCommand(command);
        await command.parseAsync(getArgv(''));
        expect(generateChangeSpy).toBeCalled();
    });
});
