import type { CapService } from '@sap-ux/cap-config-writer';
import { DefaultLogger } from '@sap-ux/fiori-generator-shared';
import childProcess from 'child_process';
import os from 'node:os';
import { installDependencies } from '../../../src/fiori-app-generator/install';
import { CommandRunner, initI18nFioriAppSubGenerator, t } from '../../../src/utils';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockSpawn = require('mock-spawn');

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    sendTelemetry: jest.fn(),
    getHostEnvironment: jest.fn()
}));

jest.mock('@sap-ux/project-access', () => {
    return {
        addPackageDevDependency: jest.fn().mockResolvedValue(undefined)
    };
});

describe('Test install queue functions', () => {
    jest.setTimeout(10000);
    let mockedSpawn = mockSpawn();
    const infoLog = jest.spyOn(DefaultLogger, 'info');
    const debugLog = jest.spyOn(DefaultLogger, 'debug');
    const commandRunSpy = jest.spyOn(CommandRunner.prototype, 'run');

    beforeAll(async () => {
        mockedSpawn = mockSpawn();
        childProcess.spawn = mockedSpawn;
        // Ensure texts are used in the tests
        await initI18nFioriAppSubGenerator();
    });

    beforeEach(() => {
        infoLog.mockClear();
        debugLog.mockClear();
        commandRunSpy.mockClear();
    });

    it('Fail with error code 1', async () => {
        mockedSpawn.setDefault(mockedSpawn.simple(1, 'Some process log', 'Stack trace error from stderr buffer'));

        await installDependencies(
            {
                appPackagePath: '/package/path',
                enableCodeAssist: false,
                useNpmWorkspaces: false,
                ui5Version: '1.2.3'
            },
            DefaultLogger
        );

        expect(infoLog).toHaveBeenCalledWith(t('logMessages.installingDependencies', { path: '/package/path' }));

        expect(infoLog).toHaveBeenCalledWith(
            os.platform() === 'win32' ? 'Running: `npm.cmd install`' : 'Running: `npm install`'
        );
        expect(infoLog).toHaveBeenCalledWith('Some process log');
        expect(infoLog).toHaveBeenCalledWith('Stack trace error from stderr buffer');
        expect(infoLog).toHaveBeenCalledWith(
            os.platform() === 'win32'
                ? '`npm.cmd install` failed with error code: 1.'
                : '`npm install` failed with error code: 1.'
        );
        expect(infoLog.mock.lastCall).toEqual([
            new Error(
                `Error code: 1 returned from \`${
                    os.platform() === 'win32' ? 'npm.cmd' : 'npm'
                } install\`. Some process log, Stack trace error from stderr buffer`
            )
        ]);
    });

    it('Successful exit code', async () => {
        mockedSpawn.setDefault(mockedSpawn.simple(0 /* exit code */, 'Another process log' /* stdout */));

        await installDependencies(
            { appPackagePath: '/package/path', enableCodeAssist: false, ui5Version: '1.2.3', useNpmWorkspaces: false },
            DefaultLogger
        );

        expect(infoLog).toHaveBeenCalledWith(t('logMessages.installingDependencies', { path: '/package/path' }));
        expect(infoLog).toHaveBeenCalledWith(
            os.platform() === 'win32' ? 'Running: `npm.cmd install`' : 'Running: `npm install`'
        );
        expect(infoLog).toHaveBeenCalledWith('Another process log');
        expect(debugLog).toHaveBeenCalledWith(expect.stringContaining('Project dependencies installed in'));
        expect(commandRunSpy).toHaveBeenCalledWith(
            os.platform() === 'win32' ? 'npm.cmd' : 'npm',
            ['install'],
            { cwd: '/package/path' },
            true
        );
    });

    it('Report to stderr', async () => {
        mockedSpawn.setDefault(mockedSpawn.simple(0 /* exit code */, '', 'Some error log' /* stderr */));

        await installDependencies(
            { appPackagePath: '/package/path', enableCodeAssist: false, ui5Version: '1.2.3', useNpmWorkspaces: false },
            DefaultLogger
        );
        expect(infoLog).toHaveBeenCalledWith(t('logMessages.installingDependencies', { path: '/package/path' }));
        expect(infoLog).toHaveBeenCalledWith(
            os.platform() === 'win32' ? 'Running: `npm.cmd install`' : 'Running: `npm install`'
        );
        expect(infoLog).toHaveBeenCalledWith('Some error log');
        expect(debugLog).toHaveBeenCalledWith(expect.stringContaining('Project dependencies installed in'));
        expect(infoLog).not.toHaveBeenCalledWith(
            os.platform() === 'win32'
                ? '`npm.cmd install` failed with error code 0.'
                : '`npm install` failed with error code 0.'
        );
        expect(commandRunSpy).toHaveBeenCalledWith(
            os.platform() === 'win32' ? 'npm.cmd' : 'npm',
            ['install'],
            { cwd: '/package/path' },
            true
        );
    });

    it('Should install dependencies to CAP app package if `useNpmWorkspaces` is false', async () => {
        commandRunSpy.mockResolvedValue('[]');

        await installDependencies(
            {
                appPackagePath: '/app/package/path',
                enableCodeAssist: true,
                ui5Version: '1.2.3',
                useNpmWorkspaces: false,
                capService: {
                    projectPath: '/cap/project/path'
                } as CapService
            },
            DefaultLogger
        );

        expect(commandRunSpy).toHaveBeenCalledWith(
            os.platform() === 'win32' ? 'npm.cmd' : 'npm',
            expect.arrayContaining([
                'install',
                expect.stringMatching(new RegExp(/^eslint/)),
                expect.stringMatching(new RegExp(/^@sap\/eslint-plugin-ui5-jsdocs/)),
                expect.stringMatching(new RegExp(/^@sapui5\/ts-types/))
            ]),
            { cwd: '/app/package/path' },
            true
        );
        expect(infoLog).toHaveBeenCalledWith(t('logMessages.installingDependencies', { path: '/app/package/path' }));
    });

    it('Should install dependencies to CAP project root package if `useNpmWorkspaces` is true', async () => {
        commandRunSpy.mockResolvedValue('[]');

        await installDependencies(
            {
                appPackagePath: '/app/package/path',
                enableCodeAssist: true,
                ui5Version: '1.2.3',
                useNpmWorkspaces: true,
                capService: {
                    projectPath: '/cap/project/path'
                } as CapService
            },
            DefaultLogger
        );

        expect(commandRunSpy).toHaveBeenCalledWith(
            os.platform() === 'win32' ? 'npm.cmd' : 'npm',
            expect.arrayContaining(['install']),
            { cwd: '/cap/project/path' },
            true
        );
    });
});
