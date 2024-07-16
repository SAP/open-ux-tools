import type { OdataService } from '@sap-ux/odata-service-writer';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { readFileSync } from 'fs';
import { create as createStore } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join, dirname } from 'path';
import {
    TableType,
    type FEOPSettings,
    type FioriElementsApp,
    type LROPSettings,
    type WorklistSettings
} from '../src/types';
import { promisify } from 'util';
import { exec as execCP } from 'child_process';
const exec = promisify(execCP);
import { ServiceType } from '@sap-ux/odata-service-writer';

export const testOutputDir = join(__dirname, 'test-output');

export const debug = prepareDebug();

/**
 * Initializes the debug object.
 *
 * @returns {{ enabled: boolean; outputDir: string; debugFull: boolean }} - the debug object
 */
export function prepareDebug(): { enabled: boolean; outputDir: string; debugFull: boolean } {
    const debug = !!process.env['UX_DEBUG'];
    const debugFull = !!process.env['UX_DEBUG_FULL'];
    if (debug) {
        console.log(testOutputDir);
    }
    return { enabled: debug, outputDir: testOutputDir, debugFull };
}

const sampleTestStore = create(createStore());

/**
 * Get (and load to store) the specified service test data.
 *
 * @param serviceName
 * @param serviceType
 * @returns
 */
export const getTestData = (serviceName: string, serviceType: 'metadata' | 'annotations') => {
    const sampleDataPath = join(__dirname, 'sample', serviceName, `${serviceType}.xml`);
    if (sampleTestStore.exists(sampleDataPath)) {
        return sampleTestStore.read(sampleDataPath);
    }
    return sampleTestStore.write(sampleDataPath, readFileSync(sampleDataPath));
};

/**
 * Base FE app settings.
 *
 * @param appId
 * @param addUi5Config
 * @returns {(Partial<FioriElementsApp<LROPSettings | FEOPSettings>>)} - the base config
 */
export const feBaseConfig = (
    appId: string,
    addUi5Config: boolean = true
): Partial<FioriElementsApp<LROPSettings | FEOPSettings>> => {
    const config: Partial<FioriElementsApp<LROPSettings | FEOPSettings>> = {
        app: {
            id: appId,
            title: 'App "Title" \\"',
            description: 'A Fiori application.',
            flpAppId: `${appId}-tile`,
            sourceTemplate: {
                version: '1.2.3-test',
                id: 'test-fe-template'
            },
            projectType: 'EDMXBackend'
        },
        appOptions: {
            loadReuseLibs: true
        },
        package: {
            name: appId,
            description: 'A Fiori application.'
        }
    } as Partial<FioriElementsApp<LROPSettings | FEOPSettings>>;

    if (addUi5Config) {
        config.ui5 = {
            version: '1.92.0',
            minUI5Version: '1.90.0',
            descriptorVersion: '1.37.0',
            ui5Libs: [],
            ui5Theme: 'sap_belize',
            localVersion: '1.86.3'
        };
    }

    return config;
};

export const v4Service: OdataService = {
    path: '/sap/opu/odata4/dmo/sb_travel_mduu_o4/srvd/dmo/sd_travel_mduu/0001/',
    url: 'http://example.feop.v4',
    version: OdataVersion.v4,
    metadata: getTestData('travel_v4', 'metadata'),
    localAnnotationsName: 'annotation'
};

export const v2Service: OdataService = {
    path: '/sap/opu/odata/sap/SEPMRA_PROD_MAN',
    url: 'http://example.lrop.v2',
    version: OdataVersion.v2,
    metadata: getTestData('sepmra_prod_man_v2', 'metadata'),
    annotations: {
        technicalName: 'SEPMRA_PROD_MAN_ANNO_MDL',
        xml: getTestData('sepmra_prod_man_v2', 'annotations')
    },
    client: '012'
};

export const v4TemplateSettings: LROPSettings | FEOPSettings | WorklistSettings = {
    entityConfig: {
        mainEntityName: 'Travel',
        navigationEntity: {
            EntitySet: 'Booking',
            Name: '_Booking'
        }
    }
};

export const v4TemplateSettingsTreeTable: LROPSettings | FEOPSettings | WorklistSettings = {
    entityConfig: {
        mainEntityName: 'Travel',
        navigationEntity: {
            EntitySet: 'Booking',
            Name: '_Booking'
        }
    },
    tableType: TableType.TREE,
    hierarchyQualifier: 'HierarchyNode'
};
export const v2TemplateSettings: LROPSettings | WorklistSettings = {
    entityConfig: {
        mainEntityName: 'SEPMRA_C_PD_Product',
        navigationEntity: {
            EntitySet: 'SEPMRA_C_PD_ProductSalesData',
            Name: 'to_ProductSalesData'
        }
    }
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
    config: FioriElementsApp<unknown>,
    debugFull = false
): Promise<void> => {
    if (debugFull && (config.appOptions?.typescript ?? config.appOptions?.eslint)) {
        // Do additonal checks on generated projects
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        let npmResult;
        try {
            // Do npm install
            npmResult = await exec(`${npm} install`, { cwd: rootPath });
            console.log('stdout:', npmResult.stdout);
            console.log('stderr:', npmResult.stderr);

            // run checks on the project
            if (config.appOptions?.typescript && config.service?.type === ServiceType.EDMX) {
                // Check TS Types
                npmResult = await exec(`${npm} run ts-typecheck`, { cwd: rootPath });
                console.log('stdout:', npmResult.stdout);
                console.log('stderr:', npmResult.stderr);
                // Check Eslint
                npmResult = await exec(`${npm} run lint`, { cwd: rootPath });
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
