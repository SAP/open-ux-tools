import * as btpUtils from '@sap-ux/btp-utils';
import '@sap-ux/jest-file-matchers';
import { readdirSync, readFileSync } from 'node:fs';
import cloneDeep from 'lodash/cloneDeep';
import { join } from 'node:path';
import type { ApiHubConfig, Project, Service, State } from '../../../src/types';
import { ApiHubType, FloorplanFE } from '../../../src/types';
import { cleanTestDir, getTestDir, ignoreMatcherOpts, originalCwd, runWritingPhaseGen } from '../test-utils';
import { baseTestProject, getExpectedOutputPath, v2EntityConfig, v2Service } from './test-utils';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

/**
 * Tests that optional settings generate the correct outputs
 *
 */
describe('Optional settings', () => {
    let testProjectName;
    let project: Partial<Project>;
    const testDir: string = getTestDir('options');

    const defaultFEState: Partial<State> = {
        service: { ...v2Service, annotations: undefined },
        entityRelatedConfig: v2EntityConfig,
        floorplan: FloorplanFE.FE_LROP
    };

    beforeAll(() => {
        cleanTestDir(testDir);
    });

    afterAll(() => {
        // Remove the test folder if the folder is empty (i.e. no failed tests)
        try {
            if (readdirSync(testDir).length === 0) {
                console.log('Removing test output folder');
                cleanTestDir(testDir);
            }
            process.chdir(originalCwd);
        } catch {
            () => {
                // Needed for lint
            };
        }
    });

    beforeEach(() => {
        project = cloneDeep({
            ...baseTestProject(testDir),
            manifestVersion: undefined, // Allows default handling
            ui5Version: '1.68.0',
            ui5Theme: 'sap_belize',
            skipAnnotations: false,
            sapux: true
        });
    });

    // Code Assist test removed - functionality deprecated and hidden

    it('Add FLP Config to OData proxy project, without OData service (LCAP)', async () => {
        testProjectName = 'lrop_v2_eslint';
        const expectedOutputPath = getExpectedOutputPath(testProjectName);

        const testFEState: Partial<State> = cloneDeep({
            ...defaultFEState,
            project: Object.assign({}, project, {
                name: testProjectName,
                enableEslint: true
            }) as Project
        });
        await runWritingPhaseGen(testFEState);
        expect(join(testDir, testProjectName)).toMatchFolder(expectedOutputPath, ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('TypeScript', async () => {
        testProjectName = 'lrop_v2_typescript';
        const expectedOutputPath = getExpectedOutputPath(testProjectName);

        const testFEState: Partial<State> = cloneDeep({
            ...defaultFEState,
            project: Object.assign({}, project, {
                name: testProjectName,
                enableTypeScript: true
            }) as Project
        });
        await runWritingPhaseGen(testFEState);
        expect(join(testDir, testProjectName)).toMatchFolder(expectedOutputPath, ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('Theme settings', async () => {
        testProjectName = 'test_dark_theme';

        const testFEState: Partial<State> = cloneDeep({
            ...defaultFEState,
            project: Object.assign({}, project, {
                name: testProjectName,
                ui5Theme: 'sap_fiori_3_dark'
            }) as Project
        });

        await runWritingPhaseGen(testFEState);
        let fileAsString = readFileSync(join(testDir, testProjectName, 'webapp/index.html')).toString();
        expect(fileAsString).toMatch(/data-sap-ui-theme="sap_fiori_3_dark"/);

        fileAsString = readFileSync(join(testDir, testProjectName, 'ui5-local.yaml')).toString();
        expect(fileAsString).toMatch(/- name: themelib_sap_fiori_3/);

        cleanTestDir(join(testDir, testProjectName));
    });

    it('Horizon theme test', async () => {
        testProjectName = 'test_horizon_theme';

        const testFEState: Partial<State> = cloneDeep({
            ...defaultFEState,
            project: Object.assign({}, project, {
                name: testProjectName,
                ui5Theme: 'sap_horizon',
                ui5Version: '1.102.0'
            }) as Project
        });

        await runWritingPhaseGen(testFEState);
        let fileAsString = readFileSync(join(testDir, testProjectName, 'webapp/index.html')).toString();
        expect(fileAsString).toMatch(/data-sap-ui-theme="sap_horizon"/);

        fileAsString = readFileSync(join(testDir, testProjectName, 'ui5-local.yaml')).toString();
        expect(fileAsString).toMatch(/- name: themelib_sap_horizon/);

        cleanTestDir(join(testDir, testProjectName));
    });

    it('apiHubKey writing', async () => {
        testProjectName = 'lrop_v2_apiHubKey';

        const testFEState: Partial<State> = cloneDeep({
            service: {
                ...defaultFEState.service,
                apiHubConfig: {
                    apiHubKey: 'testAPIHubKey:zbcd1234',
                    apiHubType: ApiHubType.apiHub
                } as ApiHubConfig
            } as Service,
            project: Object.assign({}, project, {
                name: testProjectName
            }) as Project,
            entityRelatedConfig: v2EntityConfig,
            floorplan: FloorplanFE.FE_LROP
        });
        jest.spyOn(btpUtils, 'isAppStudio').mockImplementation(() => true);
        await runWritingPhaseGen(testFEState);
        const fileAsString = readFileSync(join(testDir, testProjectName, '.env')).toString();
        expect(fileAsString).toMatchInlineSnapshot(`
            "API_HUB_API_KEY=testAPIHubKey:zbcd1234
            API_HUB_TYPE=API_HUB"
        `);
        cleanTestDir(join(testDir, testProjectName));
    });
});
