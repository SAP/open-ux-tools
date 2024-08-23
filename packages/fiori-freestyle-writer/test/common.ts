import type { OdataService } from '@sap-ux/odata-service-writer';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { sample } from './sample/metadata';
import { create as createStore } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { FreestyleApp } from '../src';
import { promisify } from 'util';
import { exec as execCP } from 'child_process';
const exec = promisify(execCP);
import { ServiceType } from '@sap-ux/odata-service-writer';

export const testOutputDir = join(__dirname, '/test-output');

export const debug = prepareDebug();

/**
 * @returns object
 *          object.enabled debug enabled boolean
 *          object.outputDir output directory
 */
export function prepareDebug(): { enabled: boolean; outputDir: string; debugFull: boolean } {
    const debug = !!process.env['UX_DEBUG'];
    const debugFull = !!process.env['UX_DEBUG_FULL'];

    if (debug) {
        console.log(testOutputDir);
    }
    return { enabled: debug, outputDir: testOutputDir, debugFull };
}

export const commonConfig = {
    app: {
        id: 'test.me',
        title: 'My Test App',
        flpAppId: 'testme-app',
        sourceTemplate: {
            version: '1.2.3-test',
            id: 'test-template'
        },
        projectType: 'EDMXBackend'
    },
    package: {
        name: 'test.me'
    },
    ui5: {
        localVersion: '1.90.0',
        version: '', // I.e Latest
        ui5Theme: 'sap_fiori_3',
        ui5Libs: 'sap.m,sap.ushell'
    }
};

export const northwind: OdataService = {
    url: 'https://services.odata.org',
    path: '/V2/Northwind/Northwind.svc',
    version: OdataVersion.v2,
    metadata: sample.NorthwindV2
};

const sampleTestStore = create(createStore());
export const getMetadata = (serviceName: string) => {
    const metadataPath = join(__dirname, 'sample', serviceName, 'metadata.xml');
    if (sampleTestStore.exists(metadataPath)) {
        return sampleTestStore.read(metadataPath);
    }

    return sampleTestStore.write(metadataPath, readFileSync(metadataPath));
};
export const updatePackageJSONDependencyToUseLocalPath = async (rootPath: string, fs: Editor): Promise<void> => {
    const packagePath = join(rootPath, 'package.json');
    const packageJson = fs.readJSON(packagePath) as any;
    if (packageJson?.devDependencies?.['@sap-ux/eslint-plugin-fiori-tools']) {
        packageJson.devDependencies['@sap-ux/eslint-plugin-fiori-tools'] = dirname(
            require.resolve('@sap-ux/eslint-plugin-fiori-tools/package.json')
        );
    }
    fs.writeJSON(packagePath, packageJson);
};
export const projectChecks = async (
    rootPath: string,
    config: FreestyleApp<unknown>,
    debugFull = false
): Promise<void> => {
    if (debugFull && (config.appOptions?.typescript || config.appOptions?.eslint)) {
        // Do additonal checks on generated projects
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        let npmResult;
        try {
            // Do npm install
            npmResult = await exec(`${npm} install`, { cwd: rootPath });
            console.log('stdout:', npmResult.stdout);
            console.log('stderr:', npmResult.stderr);

            // run checks on the project
            // Check TS Types
            if (config.appOptions?.typescript && config.service?.type === ServiceType.EDMX) {
                npmResult = await exec(`${npm} run ts-typecheck`, { cwd: rootPath });
                console.log('stdout:', npmResult.stdout);
                console.log('stderr:', npmResult.stderr);
            }
            // Check Eslint
            if (config.appOptions?.eslint) {
                npmResult = await exec(`${npm} run lint`, { cwd: rootPath });
                console.log('stdout:', npmResult.stdout);
                console.log('stderr:', npmResult.stderr);
            }
        } catch (error) {
            console.log('stdout:', error?.stdout);
            console.log('stderr:', error?.stderr);
            expect(error).toBeUndefined();
        }
    }
};
