import { join } from 'path';
import applicationSchema from './page-editor-api/data/schema/App.json';
import applicationConfig from './page-editor-api/data/config/App.json';
import listReportSchema from './page-editor-api/data/schema/ListReport.json';
import listReportConfig from './page-editor-api/data/config/ListReport.json';
import objectPageSchema from './page-editor-api/data/schema/ObjectPage.json';
import objectPageConfig from './page-editor-api/data/config/ObjectPage.json';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'fs';

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

export const mockSpecificationImport = (
    importProjectMock: jest.Mock<Promise<{ dataSourceUri: string; fileContent: string }[]>>,
    overwriteFiles: { dataSourceUri: string; fileContent: string }[] = []
) => {
    importProjectMock.mockResolvedValue([
        // Application config and schema
        getDataFile('app.json', overwriteFiles),
        getDataFile(join('.schemas', 'App.json'), overwriteFiles),
        getDataFile(join('pages', 'TravelList.json'), overwriteFiles),
        getDataFile(join('.schemas', 'ListReport_TravelList.json'), overwriteFiles),
        getDataFile(join('pages', 'TravelObjectPage.json'), overwriteFiles),
        getDataFile(join('.schemas', 'ObjectPage_TravelObjectPage.json'), overwriteFiles)
    ]);
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

export function removeDirectory(dirPath: string): void {
    if (!existsSync(dirPath)) {
        return;
    }

    const files = readdirSync(dirPath);

    for (const file of files) {
        const filePath = join(dirPath, file);
        const fileStats = lstatSync(filePath);

        if (fileStats.isDirectory()) {
            removeDirectory(filePath); // Recursive call
        } else {
            unlinkSync(filePath); // Remove file
        }
    }

    rmdirSync(dirPath); // Remove the directory itself
}
