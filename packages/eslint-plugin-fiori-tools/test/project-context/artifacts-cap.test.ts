import { jest } from '@jest/globals';
import type { WorkerResult } from '../../src/project-context/types.js';

const PROJECT_ROOT = '/project';
const APP1_ROOT = '/project/app/app1';
const APP2_ROOT = '/project/app/app2';
const APP1_MANIFEST = '/project/app/app1/webapp/manifest.json';
const APP2_MANIFEST = '/project/app/app2/webapp/manifest.json';
const CAP_I18N_PATH = '/project/_i18n/i18n_en.properties';
const APP1_SAP_APP_I18N = '/project/app/app1/webapp/i18n/i18n.properties';
const APP2_SAP_APP_I18N = '/project/app/app2/webapp/i18n/i18n.properties';
// A model-only path that should NOT appear in CAP results
const APP1_MODEL_ONLY_I18N = '/project/app/app1/webapp/i18n/i18n.model.properties';

const findProjectRootMock = jest.fn<() => Promise<string>>().mockResolvedValue(PROJECT_ROOT);
const findRootsForPathMock = jest.fn<() => Promise<{ appRoot: string }>>().mockResolvedValue({ appRoot: APP1_ROOT });
const getProjectTypeMock = jest.fn<() => Promise<string>>().mockResolvedValue('CAPNodejs');
const findFioriArtifactsMock = jest
    .fn<() => Promise<{ applications: { appRoot: string; manifestPath: string }[] }>>()
    .mockResolvedValue({
        applications: [
            { appRoot: APP1_ROOT, manifestPath: APP1_MANIFEST },
            { appRoot: APP2_ROOT, manifestPath: APP2_MANIFEST }
        ]
    });
const getCapEnvironmentMock = jest.fn<() => Promise<object>>().mockResolvedValue({});
const getCdsFilesMock = jest.fn<() => Promise<string[]>>().mockResolvedValue(['/project/srv/service.cds']);
const getI18nPropertiesPathsMock = jest.fn().mockImplementation(async (manifestPath: unknown) => {
    if (manifestPath === APP1_MANIFEST) {
        return { 'sap.app': APP1_SAP_APP_I18N, models: { extra: { path: APP1_MODEL_ONLY_I18N } } };
    }
    return { 'sap.app': APP2_SAP_APP_I18N, models: {} };
});
const getCapI18nFilesMock = jest.fn<() => string[]>().mockReturnValue(['/project/_i18n/i18n']);
const capPropertiesPathMock = jest.fn<() => string>().mockReturnValue(CAP_I18N_PATH);

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    findProjectRoot: findProjectRootMock,
    findRootsForPath: findRootsForPathMock,
    getProjectType: getProjectTypeMock,
    findFioriArtifacts: findFioriArtifactsMock,
    getCapEnvironment: getCapEnvironmentMock,
    getCdsFiles: getCdsFilesMock,
    getI18nPropertiesPaths: getI18nPropertiesPathsMock
}));

jest.unstable_mockModule('@sap-ux/i18n', () => ({
    getCapI18nFiles: getCapI18nFilesMock,
    capPropertiesPath: capPropertiesPathMock
}));

let getProjectArtifacts: (filePath: string) => Promise<WorkerResult>;

beforeAll(async () => {
    ({ getProjectArtifacts } = await import('../../src/project-context/artifacts.js'));
});

describe('getProjectArtifacts (CAP project)', () => {
    it('should assign the shared CAP i18n path and sap.app path to every app, excluding model-only paths', async () => {
        const result = await getProjectArtifacts(APP1_MANIFEST);

        expect(result.projectType).toBe('CAPNodejs');

        // every app gets the project-wide CAP path prepended, then its own sap.app path
        expect(result.i18nPathsByApp[APP1_ROOT]).toEqual([CAP_I18N_PATH, APP1_SAP_APP_I18N]);
        expect(result.i18nPathsByApp[APP2_ROOT]).toEqual([CAP_I18N_PATH, APP2_SAP_APP_I18N]);

        // model paths are excluded for CAP projects (only sap.app is used, not sap.ui5 models)
        expect(result.i18nPathsByApp[APP1_ROOT]).not.toContain(APP1_MODEL_ONLY_I18N);
    });
});
