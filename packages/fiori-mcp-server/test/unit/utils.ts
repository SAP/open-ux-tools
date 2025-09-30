import { join } from 'node:path';
import applicationSchema from './page-editor-api/test-data/schema/App.json';
import applicationConfig from './page-editor-api/test-data/config/App.json';
import listReportSchema from './page-editor-api/test-data/schema/ListReport.json';
import listReportConfig from './page-editor-api/test-data/config/ListReport.json';
import objectPageSchema from './page-editor-api/test-data/schema/ObjectPage.json';
import objectPageConfig from './page-editor-api/test-data/config/ObjectPage.json';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { execSync } from 'child_process';

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

export function removeDirectory(
    dirPath: string,
    options: { skipNodeModules?: boolean; preserveRoot?: boolean } = {}
): void {
    const { skipNodeModules = true, preserveRoot = true } = options;

    if (!existsSync(dirPath)) {
        return;
    }

    // Skip node_modules directories if skipNodeModules is true
    if (skipNodeModules && dirPath.endsWith('node_modules')) {
        return;
    }

    try {
        if (preserveRoot) {
            // Remove contents but preserve the root directory
            const files = readdirSync(dirPath);
            for (const file of files) {
                const filePath = join(dirPath, file);
                const fileStats = lstatSync(filePath);

                if (fileStats.isDirectory()) {
                    // For subdirectories, remove completely (don't preserve)
                    removeDirectory(filePath, { skipNodeModules, preserveRoot: false });
                } else {
                    unlinkSync(filePath);
                }
            }
        } else {
            // Remove the entire directory and its contents using modern rmSync
            rmSync(dirPath, { recursive: true, force: true });
        }
    } catch (error) {
        console.error(`Failed to remove directory ${dirPath}:`, error);
        throw error;
    }
}

export function npmInstall(projectPath: string): void {
    const isWindows = process.platform === 'win32';
    const npmCommand = isWindows ? 'npm.cmd' : 'npm';

    // Check if node_modules exists and is not empty
    const nodeModulesPath = join(projectPath, 'node_modules');
    if (existsSync(nodeModulesPath)) {
        const stat = lstatSync(nodeModulesPath);
        if (stat.isDirectory()) {
            const contents = readdirSync(nodeModulesPath);
            if (contents.length > 0) {
                return;
            }
        }
    }

    try {
        execSync(`${npmCommand} install`, {
            cwd: projectPath,
            stdio: 'inherit'
        });
        console.log('npm install completed successfully');
    } catch (error) {
        console.error('npm install failed:', error);
        throw error;
    }
}
