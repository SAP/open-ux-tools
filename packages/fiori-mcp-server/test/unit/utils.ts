import { join } from 'node:path';
import applicationSchema from './page-editor-api/test-data/schema/App.json';
import applicationConfig from './page-editor-api/test-data/config/App.json';
import listReportSchema from './page-editor-api/test-data/schema/ListReport.json';
import listReportConfig from './page-editor-api/test-data/config/ListReport.json';
import objectPageSchema from './page-editor-api/test-data/schema/ObjectPage.json';
import objectPageConfig from './page-editor-api/test-data/config/ObjectPage.json';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import type { FlexChange } from '../../src/page-editor-api/flex';
import type { ReadAppResult, Specification } from '@sap/ux-specification/dist/types/src';
import type { ApplicationAccess } from '@sap-ux/project-access';

const getDataFile = (
    dataSourceUri: string,
    overwriteFiles: { dataSourceUri: string; fileContent: string }[] = []
): { dataSourceUri: string; fileContent: string } => {
    let fileContent: string = overwriteFiles.find((file) => file.dataSourceUri === dataSourceUri)?.fileContent ?? '';
    if (!fileContent) {
        if (dataSourceUri === 'app.json') {
            fileContent = JSON.stringify(applicationConfig);
        } else if (dataSourceUri === join('.schemas', 'App.json')) {
            fileContent = JSON.stringify(applicationSchema);
        } else if (dataSourceUri === join('pages', 'TravelList.json')) {
            fileContent = JSON.stringify(listReportConfig);
        } else if (dataSourceUri === join('.schemas', 'ListReport_TravelList.json')) {
            fileContent = JSON.stringify(listReportSchema);
        } else if (dataSourceUri === join('pages', 'TravelObjectPage.json')) {
            fileContent = JSON.stringify(objectPageConfig);
        } else if (dataSourceUri === join('.schemas', 'ObjectPage_TravelObjectPage.json')) {
            fileContent = JSON.stringify(objectPageSchema);
        }
    }
    return {
        dataSourceUri,
        fileContent
    };
};

export const mockSpecificationReadApp = (
    readAppMock: jest.Mock<Promise<{ files: { dataSourceUri: string; fileContent: string }[] }>>,
    overwriteFiles: { dataSourceUri: string; fileContent: string }[] = []
) => {
    readAppMock.mockResolvedValue({
        files: [
            // Application config and schema
            getDataFile('app.json', overwriteFiles),
            getDataFile(join('.schemas', 'App.json'), overwriteFiles),
            getDataFile(join('pages', 'TravelList.json'), overwriteFiles),
            getDataFile(join('.schemas', 'ListReport_TravelList.json'), overwriteFiles),
            getDataFile(join('pages', 'TravelObjectPage.json'), overwriteFiles),
            getDataFile(join('.schemas', 'ObjectPage_TravelObjectPage.json'), overwriteFiles)
        ]
    });
};

export const mockSpecificationReadAppWithModel = (
    readAppMock: jest.Mock<Promise<{ files: { dataSourceUri: string; fileContent: string }[] }>>,
    appPath: string,
    applications: { [key: string]: ApplicationAccess } = {}
) => {
    readAppMock.mockImplementation(async (): Promise<ReadAppResult> => {
        return readAppWithModel(appPath, applications);
    });
};

export function copyDirectory(src: string, dest: string): void {
    if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
        }
    }
}

export function generateFlexChanges(
    fileName: string,
    content: { newValue?: string; property: string; newBinding?: string },
    fileType = 'change',
    changeType = 'propertyChange'
): FlexChange {
    return {
        fileName,
        fileType,
        changeType,
        content,
        'selector': {
            'id': 'project::sap.suite.ui.generic.template.ListReport.view.ListReport::Travel--listReport-TravelID'
        }
    };
}

async function getLocalSpecification(): Promise<Specification> {
    const moduleName = '@sap/ux-specification';
    // Workaround loading issue with '@sap-ux/odata-annotation-core-types' - it will be fixed in new spec version
    jest.mock(
        '@sap-ux/odata-annotation-core-types',
        () => ({
            DiagnosticSeverity: {}
        }),
        { virtual: true }
    );
    return import(moduleName);
}

export async function readAppWithModel(
    path: string,
    applications: { [key: string]: ApplicationAccess } = {}
): Promise<ReadAppResult> {
    const specification = await getLocalSpecification();
    const result = await specification.readApp({
        app: applications[path] ?? path
    });
    return result;
}

export async function ensureSpecificationLoaded(): Promise<void> {
    await getLocalSpecification();
    process.env.MCP_SPEC_LOADED = '1';
}
