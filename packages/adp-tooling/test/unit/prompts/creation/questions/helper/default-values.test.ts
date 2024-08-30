import { readdirSync } from 'fs';

import { AdaptationProjectType } from '@sap-ux/axios-extension';

import type {
    Application,
    ConfigInfoPrompter,
    ConfigurationInfoAnswers,
    ManifestManager,
    UI5VersionManager
} from '../../../../../../src';
import {
    generateValidNamespace,
    getDefaultAch,
    getDefaultFioriId,
    getDefaultProjectName,
    getDefaultProjectType,
    getProjectNames,
    getVersionDefaultValue
} from '../../../../../../src';

const readdirSyncMock = readdirSync as jest.Mock;

jest.mock('fs', () => ({ ...jest.requireActual('fs'), readdirSync: jest.fn() }));

describe('Default Values Tests', () => {
    describe('generateValidNamespace', () => {
        it('returns the namespace without prefix if not customer base layer', () => {
            const result = generateValidNamespace('app.variant', false);

            expect(result).toEqual('app.variant');
        });

        it('returns the namespace with a customer prefix if customer base layer', () => {
            const result = generateValidNamespace('app.variant', true);

            expect(result).toEqual('customer.app.variant');
        });
    });

    describe('getProjectNames', () => {
        it('returns an empty array if no projects match', () => {
            readdirSyncMock.mockReturnValue([]);
            const result = getProjectNames('/usr/projects');

            expect(result).toEqual([]);
        });

        it('returns sorted project names that match the regex', () => {
            const mockDirents = [
                { name: 'app.variant1', isFile: () => false },
                { name: 'app.variant10', isFile: () => false },
                { name: 'app.variant2', isFile: () => false },
                { name: 'somefile.txt', isFile: () => true }
            ];
            readdirSyncMock.mockReturnValue(mockDirents);
            const result = getProjectNames('/usr/projects');

            expect(result).toEqual(['app.variant2', 'app.variant10', 'app.variant1']);
        });
    });

    describe('getDefaultProjectName', () => {
        it('generates a default project name when there are no existing projects', () => {
            readdirSyncMock.mockReturnValue([]);
            const result = getDefaultProjectName('/usr/projects');

            expect(result).toEqual('app.variant1');
        });

        it('generates a default project name based on the highest existing project index', () => {
            const mockDirents = [
                { name: 'app.variant2', isFile: () => false },
                { name: 'app.variant1', isFile: () => false }
            ];
            readdirSyncMock.mockReturnValue(mockDirents);
            const result = getDefaultProjectName('/usr/projects');

            expect(result).toEqual('app.variant3');
        });
    });

    describe('getVersionDefaultValue', () => {
        it('returns an empty string if no versions are available', async () => {
            const result = await getVersionDefaultValue([], {} as UI5VersionManager);
            expect(result).toBe('');
        });

        it('returns the first version if it is valid', async () => {
            const manager = {
                validateUI5Version: jest.fn().mockResolvedValue(true)
            } as unknown as UI5VersionManager;
            const result = await getVersionDefaultValue(['1.127.0'], manager);
            expect(result).toBe('1.127.0');
        });

        it('returns an empty string if the first version is not valid', async () => {
            const manager = {
                validateUI5Version: jest.fn().mockResolvedValue('invalid')
            } as unknown as UI5VersionManager;
            const result = await getVersionDefaultValue(['1.83.0'], manager);
            expect(result).toBe('');
        });
    });

    describe('getDefaultFioriId', () => {
        const answers = { application: { id: '1' } as Application } as ConfigurationInfoAnswers;

        it('returns the Fiori registration IDs if available', async () => {
            const manager = {
                getManifest: jest.fn().mockResolvedValue({ 'sap.fiori': { registrationIds: ['F1049'] } })
            } as unknown as ManifestManager;

            const result = await getDefaultFioriId(answers, manager);

            expect(result).toBe('F1049');
        });

        it('returns an empty string if the manifest is not found', async () => {
            const manager = {
                getManifest: jest.fn().mockResolvedValue(undefined)
            } as unknown as ManifestManager;

            const result = await getDefaultFioriId(answers, manager);

            expect(result).toBe('');
        });
    });

    describe('getDefaultAch', () => {
        const answers = { application: { id: '1' } as Application } as ConfigurationInfoAnswers;

        it('returns the ACH if available', async () => {
            const manager = {
                getManifest: jest.fn().mockResolvedValue({ 'sap.app': { ach: 'ACH' } })
            } as unknown as ManifestManager;

            const result = await getDefaultAch(answers, manager);

            expect(result).toBe('ACH');
        });

        it('returns an empty string if the manifest is not found', async () => {
            const manager = {
                getManifest: jest.fn().mockResolvedValue(undefined)
            } as unknown as ManifestManager;

            const result = await getDefaultAch(answers, manager);

            expect(result).toBe('');
        });
    });

    describe('getDefaultProjectType', () => {
        it('returns onPremise if available in system info', () => {
            const prompter = {
                systemInfo: { adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE] }
            } as ConfigInfoPrompter;

            const result = getDefaultProjectType(prompter);

            expect(result).toBe(AdaptationProjectType.ON_PREMISE);
        });

        it('returns the first project type if onPremise is not available', () => {
            const prompter = {
                systemInfo: { adaptationProjectTypes: [AdaptationProjectType.CLOUD_READY] }
            } as ConfigInfoPrompter;

            const result = getDefaultProjectType(prompter);

            expect(result).toBe(AdaptationProjectType.CLOUD_READY);
        });
    });
});
