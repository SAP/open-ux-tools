import { join } from 'path';
import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Editor, create } from 'mem-fs-editor';
import type { Manifest } from '@sap-ux/project-access';
import * as appConfigWriter from '@sap-ux/app-config-writer';
import * as flpConfigInquirer from '@sap-ux/flp-config-inquirer';

import * as common from '../../../../src/common';
import * as tracer from '../../../../src/tracing/trace';
import * as logger from '../../../../src/tracing/logger';
import { addInboundNavigationConfigCommand } from '../../../../src/cli/add/navigation-config';

jest.mock('prompts');

const commitMock = jest.fn().mockImplementation((callback) => callback());
jest.mock('mem-fs-editor', () => {
    const editor = jest.requireActual<{ create: typeof create }>('mem-fs-editor');
    return {
        ...editor,
        create(store: Store) {
            const memFs: Editor = editor.create(store);
            memFs.commit = commitMock;
            return memFs;
        }
    };
});

const flpConfigAnswers = {
    semanticObject: 'so1',
    action: 'act1',
    title: 'title1',
    subTitle: ''
};

const fakeManifest = {
    'sap.app': {
        crossNavigation: {
            inbounds: {
                existingInbound: {}
            }
        }
    }
} as unknown as Manifest;

describe('Test command add navigation-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;
    let traceSpy: jest.SpyInstance;
    let genNavSpy: jest.SpyInstance;

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

        genNavSpy = jest.spyOn(appConfigWriter, 'generateInboundNavigationConfig').mockResolvedValue(fsMock);
        traceSpy = jest.spyOn(tracer, 'traceChanges');
        jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(flpConfigAnswers);

        jest.spyOn(appConfigWriter, 'readManifest').mockResolvedValue({ manifest: fakeManifest, manifestPath: '' });
        jest.spyOn(flpConfigInquirer, 'getPrompts').mockResolvedValue([]);
    });

    afterEach(() => {
        commitMock.mockClear();
    });

    test('Test add navigation-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(commitMock).toBeCalled();
        expect(traceSpy).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
    });

    test('Test add inbound-navigation <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot, '--simulate']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.debug).toBeCalled();
        expect(loggerMock.info).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();

        expect(commitMock).not.toBeCalled();
        expect(traceSpy).toBeCalled();
    });

    test('Test add inbound-navigation reports error', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        // No project at path
        await command.parseAsync(getArgv(['inbound-navigation', join(__dirname, '../../../fixtures/'), '--verbose']));

        // Result check
        expect(logLevelSpy).toBeCalled();
        expect(loggerMock.info).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).toBeCalledWith(
            expect.stringMatching(/^Error while executing add inbound navigation configuration/)
        );
        expect(loggerMock.debug).nthCalledWith(
            1,
            expect.stringMatching(/^Called add inbound navigation-config for path/)
        );
        expect(loggerMock.debug).nthCalledWith(2, expect.any(Error));
        expect(commitMock).not.toBeCalled();
        expect(traceSpy).not.toBeCalled();
    });

    test('Test add inbound-navigation calls generate when valid config is returned by prompting', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        expect(genNavSpy).toBeCalledWith(
            expect.stringContaining('bare-minimum'),
            flpConfigAnswers,
            true,
            expect.any(Object)
        );
        expect(commitMock).toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
    });

    test('Test add inbound-navigation returns and logs when config is undefined', async () => {
        jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue({ ...flpConfigAnswers, overwrite: false });
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        expect(loggerMock.info).toHaveBeenCalledWith(
            'User chose not to overwrite existing inbound navigation configuration.'
        );
        expect(genNavSpy).not.toBeCalled();
        expect(commitMock).not.toBeCalled();
        expect(loggerMock.warn).not.toBeCalled();
        expect(loggerMock.error).not.toBeCalled();
    });
});
