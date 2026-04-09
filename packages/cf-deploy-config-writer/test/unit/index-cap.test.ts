import { jest } from '@jest/globals';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fsExtra from 'fs-extra';

const __dirname = join(fileURLToPath(import.meta.url), '..');

const realHasbin = await import('hasbin');
jest.unstable_mockModule('hasbin', () => ({
    ...realHasbin,
    sync: jest.fn()
}));

const { MockMta } = await import('./mockMta');
jest.unstable_mockModule('@sap/mta-lib', () => ({
    Mta: MockMta
}));

const realProjectAccess = await import('@sap-ux/project-access');
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    getCapProjectType: jest.fn()
}));

const hasbin = await import('hasbin');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');
const { generateCAPConfig } = await import('../../src');
const { RouterModuleType } = await import('../../src');
const projectAccess = await import('@sap-ux/project-access');
const { CommandRunner } = await import('@sap-ux/nodejs-utils');

let hasSyncMock: jest.Mock;
let commandRunnerMock: ReturnType<typeof jest.spyOn>;
const originalPlatform = process.platform;

describe('CF Writer CAP', () => {
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });
    const outputDir = join(__dirname, '../test-output', 'capcds');

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        hasSyncMock = (hasbin.sync as jest.Mock).mockImplementation(() => true);
    });

    beforeAll(() => {
        fsExtra.removeSync(outputDir);
        jest.clearAllMocks();
        Object.defineProperty(process, 'platform', { value: 'win32' });
    });

    afterAll(() => {
        jest.resetAllMocks();
        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        });
    });

    it.each([[RouterModuleType.Managed], [RouterModuleType.Standard]])(
        'Validate generation of CAP mta configurations %s',
        async (routerType: RouterModuleType) => {
            const mtaId = 'captestproject';
            const mtaPath = join(outputDir, routerType, mtaId);
            fsExtra.mkdirSync(mtaPath, { recursive: true });
            fsExtra.copySync(join(__dirname, `../sample/capcds`), mtaPath);
            const getCapProjectTypeMock = jest.spyOn(projectAccess, 'getCapProjectType').mockResolvedValue('CAPNodejs');
            // For testing purposes, an existing mta.yaml is copied to reflect the command;
            // `cds add mta xsuaa connectivity destination html5-repo`
            commandRunnerMock = jest.spyOn(CommandRunner.prototype, 'run').mockImplementation(() => {
                fsExtra.copySync(join(__dirname, `fixtures/mta-types/cdsmta`), mtaPath);
                return { status: 0 } as any;
            });
            const localFs = await generateCAPConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType
                },
                undefined,
                logger
            );
            expect(localFs.read(join(mtaPath, 'mta.yaml'))).toMatchSnapshot();
            expect(localFs.read(join(mtaPath, 'package.json'))).toMatchSnapshot(); // Ensure it hasn't changed! // Ensure it hasn't changed!
            expect(getCapProjectTypeMock).toHaveBeenCalled();
            expect(commandRunnerMock.mock.calls).toHaveLength(1);
            expect(commandRunnerMock).toHaveBeenCalledWith(
                'cds',
                ['add', 'mta', 'xsuaa', 'destination', 'html5-repo'],
                expect.objectContaining({ cwd: expect.stringContaining(mtaId) })
            );
            if (RouterModuleType.Standard === routerType) {
                expect(localFs.read(join(mtaPath, `router`, 'package.json'))).toMatchSnapshot();
                expect(localFs.read(join(mtaPath, `router`, 'xs-app.json'))).toMatchSnapshot();
            }
        }
    );

    test('Validate CAP project type is correct when creating mta.yaml', async () => {
        const mtaId = 'captestproject';
        const mtaPath = join(outputDir, mtaId);
        jest.spyOn(projectAccess, 'getCapProjectType').mockResolvedValue('CAPJava');
        await expect(
            generateCAPConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType: RouterModuleType.Managed
                },
                undefined,
                logger
            )
        ).rejects.toThrow(
            'The target folder does not contain a Node.js CAP project. Please ensure the folder contains a Node.js CAP project.'
        );
    });

    test('Validate CAP type if target contains mta.yaml', async () => {
        const mtaId = 'captestproject';
        const mtaPath = join(outputDir, mtaId);
        jest.spyOn(projectAccess, 'getCapProjectType').mockResolvedValue('CAPNodejs');
        // Ensure mta.yaml actually exists on disk so isMTAFound returns true
        fsExtra.mkdirSync(mtaPath, { recursive: true });
        fsExtra.writeFileSync(join(mtaPath, 'mta.yaml'), '_schema-version: 3.3.0\nID: test\n');
        await expect(
            generateCAPConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType: RouterModuleType.Managed
                },
                undefined,
                logger
            )
        ).rejects.toThrow('An `mta.yaml` file already exists in the target directory.');
    });
});
