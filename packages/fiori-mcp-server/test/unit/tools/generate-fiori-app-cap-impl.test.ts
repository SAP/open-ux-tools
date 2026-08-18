import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GeneratorConfigCAPWithAPI } from '../../../src/tools/schemas/index.js';
import { existsSync, promises as fsPromises } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockFindInstalledPackages = jest.fn<any>().mockResolvedValue([
    {
        path: 'node_modules/@sap/generator-fiori',
        packageJsonPath: 'node_modules/@sap/generator-fiori/package.json',
        packageInfo: {
            name: '@sap/generator-fiori',
            version: '1.18.5'
        }
    }
]);
jest.unstable_mockModule('@sap-ux/nodejs-utils', () => ({
    findInstalledPackages: mockFindInstalledPackages
}));

// Mock child_process.exec
const mockExec = jest.fn<any>();
const actualChildProcess = await import('node:child_process');
jest.unstable_mockModule('child_process', () => ({
    ...actualChildProcess,
    exec: (...args: any) => mockExec(...args)
}));
jest.unstable_mockModule('node:child_process', () => ({
    ...actualChildProcess,
    exec: (...args: any) => mockExec(...args)
}));

const { generateFioriAppCap } = await import('../../../src/tools/generate-fiori-app-cap.js');

// Read package.json for version
const packageJsonModule = await import('../../../package.json', { with: { type: 'json' } });
const packageJson = packageJsonModule.default;

const testOutputDir = join(__dirname, '../../test-output/');

const paramTest: GeneratorConfigCAPWithAPI = {
    floorplan: 'FE_LROP',
    version: '0.2',
    project: {
        name: 'app1',
        targetFolder: join(testOutputDir, 'app1'),
        title: 'App 1',
        description: 'Description for App 1',
        ui5Version: '1.136.7',
        sapux: true
    },
    service: {
        servicePath: 'odata/v4/cat-service/',
        capService: {
            projectPath: 'zzzapp1',
            serviceName: 'app1',
            serviceCdsPath: 'srv/cat-service.cds',
            capType: 'Node.js' // optional
        }
    },
    entityConfig: {
        mainEntity: {
            entityName: 'Travel'
        },
        generateFormAnnotations: true,
        generateLROPAnnotations: true
    },
    telemetryData: {
        generationSourceName: '@sap-ux/fiori-mcp-server',
        generationSourceVersion: packageJson.version
    }
};

const mockFileWrite = (cb: (content: string) => void) => {
    const originalWriteFile = fsPromises.writeFile;
    fsPromises.writeFile = jest.fn<any>().mockImplementation(async (path: string, content: string) => {
        if (path.endsWith('generator-config.json')) {
            cb(content);
        }
        return originalWriteFile(path, content);
    });
};

describe('executeFunctionality', () => {
    test('executeFunctionality - success', async () => {
        let generatedConfigContent: string;
        mockExec.mockImplementation((_cmd, _opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });
        // Mock fs.writeFile to capture the generated config
        mockFileWrite((content) => {
            generatedConfigContent = content;
        });
        const result = await generateFioriAppCap(paramTest);
        expect(result).toMatchObject({
            appPath: join(testOutputDir, 'app1/app/app1'),
            changes: [],
            message: `Generation completed successfully: ${join(
                testOutputDir,
                'app1/app/app1'
            )}. You must run \`npm install\` in ${join(testOutputDir, 'app1')} before trying to run the application.`,
            status: 'Success'
        });
        expect(existsSync(join(testOutputDir, 'app1', 'default-generator-config.json'))).toBeFalsy();
        const config = JSON.parse(generatedConfigContent!);
        expect(config).toEqual({
            'entityConfig': {
                'generateFormAnnotations': true,
                'generateLROPAnnotations': true,
                'mainEntity': {
                    'entityName': 'Travel'
                }
            },
            'floorplan': 'FE_LROP',
            'project': {
                'description': 'Description for App 1',
                'name': 'app1',
                'sapux': true,
                'targetFolder': join(testOutputDir, 'app1'),
                'title': 'App 1',
                'ui5Version': '1.136.7'
            },
            'service': {
                'servicePath': 'odata/v4/cat-service/',
                'capService': {
                    'capType': 'Node.js',
                    'projectPath': 'zzzapp1',
                    'serviceCdsPath': '/srv/cat-service.cds',
                    'serviceName': 'app1'
                }
            },
            'telemetryData': {
                'generationSourceName': '@sap-ux/fiori-mcp-server',
                'generationSourceVersion': packageJson.version
            },
            'version': '0.2'
        });
    });

    test('executeFunctionality - success with floorplan="FF_SIMPLE"', async () => {
        let generatedConfigContent: string;
        mockExec.mockImplementation((_cmd, _opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });
        // Mock fs.writeFile to capture the generated config
        mockFileWrite((content) => {
            generatedConfigContent = content;
        });
        await generateFioriAppCap({
            ...paramTest,
            floorplan: 'FF_SIMPLE'
        });
        const config = JSON.parse(generatedConfigContent!);
        expect(config.project.sapux).toEqual(false);
    });

    test('executeFunctionality - success with floorplan="FF_SIMPLE" without service (no data source)', async () => {
        let generatedConfigContent: string;
        mockExec.mockImplementation((_cmd, _opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });
        mockFileWrite((content) => {
            generatedConfigContent = content;
        });
        const result = await generateFioriAppCap({
            floorplan: 'FF_SIMPLE',
            project: {
                name: 'app1',
                targetFolder: join(testOutputDir, 'app1'),
                title: 'App 1',
                description: 'Description for App 1',
                ui5Version: '1.136.7',
                sapux: true
            }
        });
        expect(result.status).toBe('Success');
        const config = JSON.parse(generatedConfigContent!);
        expect(config.project.sapux).toEqual(false);
        expect(config.service).toBeUndefined();
        expect(config.entityConfig).toBeUndefined();
    });

    test('executeFunctionality - unsuccess', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            throw new Error('Dummy');
        });
        const result = await generateFioriAppCap(paramTest);
        expect(result).toMatchObject({
            appPath: join(testOutputDir, 'app1/app/app1'),
            changes: [],
            message: `Error generating application: Dummy`,
            status: 'Error'
        });
        expect(existsSync(join(testOutputDir, 'app1', 'default-generator-config.json'))).toBeFalsy();
    });

    test('executeFunctionality - empty parameters', async () => {
        await expect(generateFioriAppCap({} as any)).rejects.toThrow();
    });

    test('executeFunctionality - parameters as non object', async () => {
        await expect(generateFioriAppCap('dummy' as any)).rejects.toThrow();
    });

    test('executeFunctionality called without parameters (unexpected in real use case)', async () => {
        await expect(generateFioriAppCap(undefined as any)).rejects.toThrow();
    });
});
