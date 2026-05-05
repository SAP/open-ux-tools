import { join } from 'node:path';
import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { Editor, create } from 'mem-fs-editor';

import type { ToolsLogger } from '@sap-ux/logger';
import * as adpTooling from '@sap-ux/adp-tooling';
import * as appConfigWriter from '@sap-ux/app-config-writer';
import * as flpConfigInquirer from '@sap-ux/flp-config-inquirer';
import { getAppType, type Manifest, type ManifestNamespace } from '@sap-ux/project-access';

import * as common from '../../../../src/common';
import * as tracer from '../../../../src/tracing/trace';
import * as logger from '../../../../src/tracing/logger';
import { addInboundNavigationConfigCommand } from '../../../../src/cli/add/navigation-config';
import app from '../../../../../abap-deploy-config-sub-generator/src/app';

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

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    flpConfigurationExists: jest.fn(),
    getAdpConfig: jest.fn(),
    getVariant: jest.fn(),
    generateInboundConfig: jest.fn(),
    getBaseAppInbounds: jest.fn(),
    isCFEnvironment: jest.fn().mockResolvedValue(false),
    getCfBaseAppInbounds: jest.fn(),
    loadCfConfig: jest.fn().mockReturnValue({}),
    getAppParamsFromUI5Yaml: jest.fn().mockReturnValue({ appHostId: '', appName: '', appVersion: '', spaceGuid: '' })
}));

jest.mock('@sap-ux/system-access', () => ({
    createAbapServiceProvider: jest.fn()
}));

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getAppType: jest.fn()
}));

jest.mock('@sap-ux/app-config-writer', () => ({
    ...jest.requireActual('@sap-ux/app-config-writer'),
    generateInboundNavigationConfig: jest.fn(),
    readManifest: jest.fn()
}));

jest.mock('@sap-ux/flp-config-inquirer', () => ({
    ...jest.requireActual('@sap-ux/flp-config-inquirer'),
    getPrompts: jest.fn(),
    getTileSettingsQuestions: jest.fn(),
    getAdpFlpConfigPromptOptions: jest.fn(),
    getAdpFlpInboundsWriterConfig: jest.fn()
}));

const getAppTypeMock = getAppType as jest.Mock;
const getVariantMock = adpTooling.getVariant as jest.Mock;
const getAdpConfigMock = adpTooling.getAdpConfig as jest.Mock;
const flpConfigurationExistsMock = adpTooling.flpConfigurationExists as jest.Mock;
const getBaseAppInboundsMock = adpTooling.getBaseAppInbounds as jest.Mock;

const flpConfigAnswers = {
    semanticObject: 'so1',
    action: 'act1',
    title: 'title1',
    subTitle: '',
    additionalParameters: '',
    icon: '',
    inboundId: 'so1-act1'
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

describe('Test command add navigation-config with ADP scenario', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let logLevelSpy: jest.SpyInstance;
    let traceSpy: jest.SpyInstance;
    let genNavSpy: jest.SpyInstance;
    let genAdpNavSpy: jest.SpyInstance;

    const getArgv = (arg: string[]) => ['', '', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();

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

        genAdpNavSpy = jest.spyOn(adpTooling, 'generateInboundConfig').mockResolvedValue(fsMock);
        genNavSpy = jest.spyOn(appConfigWriter, 'generateInboundNavigationConfig').mockResolvedValue(fsMock);
        jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue(flpConfigAnswers);
        traceSpy = jest.spyOn(tracer, 'traceChanges');

        jest.spyOn(appConfigWriter, 'readManifest').mockResolvedValue({ manifest: fakeManifest, manifestPath: '' });
        jest.spyOn(flpConfigInquirer, 'getPrompts').mockResolvedValue([]);
        jest.spyOn(flpConfigInquirer, 'getTileSettingsQuestions').mockReturnValue([]);
        jest.spyOn(flpConfigInquirer, 'getAdpFlpConfigPromptOptions').mockReturnValue({});
        jest.spyOn(flpConfigInquirer, 'getAdpFlpInboundsWriterConfig').mockReturnValue([flpConfigAnswers]);
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
        expect(commitMock).toHaveBeenCalled();
        expect(traceSpy).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot, '--simulate']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();

        expect(commitMock).not.toHaveBeenCalled();
        expect(traceSpy).toHaveBeenCalled();
    });

    test('Test add inbound-navigation reports error', async () => {
        getAppTypeMock.mockResolvedValue('SAP Fiori elements');
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        // No project at path
        await command.parseAsync(getArgv(['inbound-navigation', join(__dirname, '../../../fixtures/'), '--verbose']));

        // Result check
        expect(logLevelSpy).toHaveBeenCalled();
        expect(loggerMock.info).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringMatching(/^Error while executing add inbound navigation configuration/)
        );
        expect(loggerMock.debug).toHaveBeenNthCalledWith(
            1,
            expect.stringMatching(/^Called add inbound navigation-config for path/)
        );
        expect(loggerMock.debug).toHaveBeenNthCalledWith(2, expect.any(Error));
        expect(commitMock).not.toHaveBeenCalled();
        expect(traceSpy).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation calls generate when valid config is returned by prompting', async () => {
        getAppTypeMock.mockResolvedValue('SAP Fiori elements');

        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(genNavSpy).toHaveBeenCalledWith(
            expect.stringContaining('bare-minimum'),
            flpConfigAnswers,
            true,
            expect.any(Object)
        );
        expect(commitMock).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation returns and logs when config is undefined', async () => {
        getAppTypeMock.mockResolvedValue('SAP Fiori elements');
        jest.spyOn(common, 'promptYUIQuestions').mockResolvedValue({ ...flpConfigAnswers, overwrite: false });

        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(loggerMock.info).toHaveBeenCalledWith(
            'User chose not to overwrite existing inbound navigation configuration.'
        );
        expect(genNavSpy).not.toHaveBeenCalled();
        expect(commitMock).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation with ADP project where FLP configuration does not exist', async () => {
        getAppTypeMock.mockResolvedValue('Fiori Adaptation');
        flpConfigurationExistsMock.mockReturnValue(false);
        getBaseAppInboundsMock.mockResolvedValue({
            'semObject-action': {
                semanticObject: 'so1',
                action: 'act1',
                title: 'Test Title',
                subTitle: '',
                hideLauncher: false
            }
        });

        getVariantMock.mockReturnValue({
            id: 'variantId',
            content: []
        });

        getAdpConfigMock.mockResolvedValue({
            target: {},
            ignoreCertErrors: false
        });

        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(commitMock).toHaveBeenCalled();
        expect(genAdpNavSpy).toHaveBeenCalledWith(
            expect.stringContaining('bare-minimum'),
            expect.arrayContaining([flpConfigAnswers]),
            expect.any(Object)
        );
        expect(genNavSpy).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation with ADP project where FLP configuration does not exist with custom yaml config file', async () => {
        getAppTypeMock.mockResolvedValue('Fiori Adaptation');
        flpConfigurationExistsMock.mockReturnValue(false);
        getBaseAppInboundsMock.mockResolvedValue({
            'semObject-action': {
                semanticObject: 'so1',
                action: 'act1',
                title: 'Test Title',
                subTitle: '',
                hideLauncher: false
            }
        });

        getVariantMock.mockReturnValue({
            id: 'variantId',
            content: []
        });

        getAdpConfigMock.mockResolvedValue({
            target: {},
            ignoreCertErrors: false
        });

        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot, '--config=/test/custom.yaml']));

        // Result check
        expect(getAdpConfigMock).toHaveBeenCalledWith(appRoot, '/test/custom.yaml');
        expect(commitMock).toHaveBeenCalled();
        expect(genAdpNavSpy).toHaveBeenCalledWith(
            expect.stringContaining('bare-minimum'),
            expect.arrayContaining([flpConfigAnswers]),
            expect.any(Object)
        );
        expect(genNavSpy).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation with ADP project where getAdpConfig throws an error', async () => {
        getAppTypeMock.mockResolvedValue('Fiori Adaptation');
        flpConfigurationExistsMock.mockReturnValue(false);
        getAdpConfigMock.mockRejectedValue(new Error('Failed to get ADP config'));

        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(commitMock).not.toHaveBeenCalled();
        expect(genAdpNavSpy).not.toHaveBeenCalled();
        expect(genNavSpy).not.toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringMatching(
                /^Error while executing add inbound navigation configuration 'Failed to get ADP config'/
            )
        );
    });

    test('Test add inbound-navigation with CF ADP project fetches inbounds via FDC', async () => {
        getAppTypeMock.mockResolvedValue('Fiori Adaptation');
        flpConfigurationExistsMock.mockReturnValue(false);
        const mockCfConfig = {
            org: { GUID: 'org-guid', Name: 'org' },
            space: { GUID: 'space-guid', Name: 'space' },
            url: '/test.cf',
            token: 'test-token'
        };
        jest.spyOn(adpTooling, 'isCFEnvironment').mockResolvedValueOnce(true);
        jest.spyOn(adpTooling, 'loadCfConfig').mockReturnValueOnce(mockCfConfig);
        jest.spyOn(adpTooling, 'getAppParamsFromUI5Yaml').mockReturnValueOnce({
            appHostId: 'test-host-id',
            appName: 'test-app',
            appVersion: '1.0.0',
            spaceGuid: 'space-guid'
        });
        const getCfInboundsSpy = jest.spyOn(adpTooling, 'getCfBaseAppInbounds').mockResolvedValueOnce({
            'semObject-action': {
                semanticObject: 'so1',
                action: 'act1',
                title: 'CF Title'
            }
        } as unknown as ManifestNamespace.Inbound);

        getVariantMock.mockReturnValue({
            id: 'variantId',
            reference: 'base.app.id',
            content: []
        });

        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        expect(getCfInboundsSpy).toHaveBeenCalledWith('base.app.id', 'test-host-id', mockCfConfig, expect.anything());
        expect(getAdpConfigMock).not.toHaveBeenCalled();
        expect(commitMock).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation with CF ADP project fails when not logged in', async () => {
        getAppTypeMock.mockResolvedValue('Fiori Adaptation');
        jest.spyOn(adpTooling, 'isCFEnvironment').mockResolvedValueOnce(true);
        jest.spyOn(adpTooling, 'loadCfConfig').mockReturnValueOnce({} as adpTooling.CfConfig);

        getVariantMock.mockReturnValue({
            id: 'variantId',
            reference: 'base.app.id',
            content: []
        });

        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('CF login required'));
    });
});
