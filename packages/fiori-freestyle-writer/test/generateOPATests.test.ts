import { generateOPATests } from '../src/generateOPATests';
import { generateFreestyleOPAFiles } from '@sap-ux/ui5-test-writer';
import type { FreestyleApp, BasicAppSettings } from '../src/types';
import { TemplateType } from '../src/types';
import type { Package } from '@sap-ux/ui5-application-writer';
import type { Logger } from '@sap-ux/logger';
import { t } from '../src/i18n';

jest.mock('@sap-ux/ui5-test-writer', () => ({
    generateFreestyleOPAFiles: jest.fn()
}));

describe('generateOPATests', () => {
    const basePath = '/path/to/base';
    const ffApp = {
        app: {
            id: 'appId',
            description: 'App Description',
            title: 'App Title'
        },
        template: {
            settings: {
                viewName: 'ViewName'
            },
            type: TemplateType.Basic
        },
        ui5: {
            ui5Theme: 'sap_fiori_3',
            version: '1.71.0'
        },
        appOptions: {
            typescript: true
        }
    } as FreestyleApp<BasicAppSettings>;

    const packageJson = {
        scripts: {
            'start-mock': 'fiori run --config ./ui5-mock.yaml --open "test/flpSandbox.html"'
        }
    } as Package;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should add test scripts to package.json when addMock is true', async () => {
        const addMock = true;
        await generateOPATests(basePath, ffApp, addMock, packageJson);
        expect(generateFreestyleOPAFiles).toHaveBeenCalledWith(
            basePath,
            {
                appId: 'appId',
                applicationDescription: 'App Description',
                applicationTitle: 'App Title',
                viewName: 'ViewName',
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.71.0',
                enableTypeScript: true
            },
            undefined,
            undefined
        );
        expect(packageJson.scripts?.['unit-test']).toBe(
            "fiori run --config ./ui5-mock.yaml --open 'test/unit/unitTests.qunit.html'"
        );
        expect(packageJson.scripts?.['int-test']).toBe(
            "fiori run --config ./ui5-mock.yaml --open 'test/integration/opaTests.qunit.html'"
        );
    });

    it('should add test scripts to package.json when addMock is false', async () => {
        const addMock = false;
        await generateOPATests(basePath, ffApp, addMock, packageJson);
        expect(generateFreestyleOPAFiles).toHaveBeenCalledWith(
            basePath,
            {
                appId: 'appId',
                applicationDescription: 'App Description',
                applicationTitle: 'App Title',
                viewName: 'ViewName',
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.71.0',
                enableTypeScript: true
            },
            undefined,
            undefined
        );
        expect(packageJson.scripts?.['unit-test']).toBe("fiori run --open 'test/unit/unitTests.qunit.html'");
        expect(packageJson.scripts?.['int-test']).toBe("fiori run --open 'test/integration/opaTests.qunit.html'");
    });

    it('should not add test scripts to package.json when addMock is true and template is worklist', async () => {
        const addMock = false;
        const workListApp = {
            ...ffApp,
            template: {
                ...ffApp.template,
                type: TemplateType.Worklist
            }
        };
        const mockLog = {
            info: jest.fn()
        } as unknown as Logger;
        await generateOPATests(basePath, workListApp, addMock, packageJson, undefined, mockLog);
        expect(generateFreestyleOPAFiles).not.toHaveBeenCalled();
        expect(mockLog.info).toHaveBeenCalledWith(
            t('info.unsupportedTestTemplateMessage', { templateType: 'worklist' })
        );
    });
});
