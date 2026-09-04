import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import {
    createCanaryConfiguration,
    discoverCanaryTarget,
    verifyInstalledApplication
} from '../../../../../scripts/mockserver-data-generator-dev-kit/lib/verify-app.mjs';

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), 'mockgen-verify-app-'));
    temporaryDirectories.push(directory);
    return directory;
}

function writeInstalledPackage(appRoot: string, packageName: string, version: string): void {
    const packageRoot = join(appRoot, 'node_modules', ...packageName.split('/'));
    mkdirSync(join(packageRoot, 'dist'), { recursive: true });
    writeFileSync(
        join(packageRoot, 'package.json'),
        JSON.stringify({ name: packageName, version, main: 'dist/index.js' })
    );
    writeFileSync(join(packageRoot, 'dist', 'index.js'), 'module.exports = {};\n');
}

type ExpectedPackage = { packageName: string; version: string; specification: string };

function writeVerifiedApp(): { appRoot: string; packages: ExpectedPackage[] } {
    const appRoot = temporaryDirectory();
    const packages = [
        {
            packageName: '@sap-ux/mockserver-data-generator',
            version: '0.1.0',
            specification: 'file:.mockserver-data-generator-dev/packages/generator.tgz'
        },
        {
            packageName: '@sap-ux/fe-mockserver-core',
            version: '1.7.15',
            specification: 'file:.mockserver-data-generator-dev/packages/core.tgz'
        },
        {
            packageName: '@sap-ux/ui5-middleware-fe-mockserver',
            version: '2.4.16',
            specification: 'file:.mockserver-data-generator-dev/packages/middleware.tgz'
        }
    ];
    writeFileSync(
        join(appRoot, 'package.json'),
        `${JSON.stringify(
            {
                scripts: { 'start-mock': 'fiori run --config ./ui5-mock.yaml' },
                devDependencies: Object.fromEntries(packages.map((entry) => [entry.packageName, entry.specification])),
                ui5: { dependencies: ['@sap-ux/ui5-middleware-fe-mockserver'] }
            },
            null,
            2
        )}\n`
    );
    mkdirSync(join(appRoot, 'webapp', 'localService', 'mainService'), { recursive: true });
    writeFileSync(join(appRoot, 'webapp', 'manifest.json'), '{}\n');
    writeFileSync(
        join(appRoot, 'webapp', 'localService', 'mainService', 'metadata.xml'),
        '<Schema><EntityContainer><EntitySet Name="Products" /></EntityContainer></Schema>\n'
    );
    writeFileSync(
        join(appRoot, 'ui5-mock.yaml'),
        `server:
  customMiddleware:
    - name: sap-fe-mockserver
      configuration:
        mockDataGenerator:
          name: '@sap-ux/mockserver-data-generator/fe-mockserver'
        services:
          - urlPath: /sap/opu/odata4/mockgen
            metadataPath: ./webapp/localService/mainService/metadata.xml
`
    );
    for (const entry of packages) {
        writeInstalledPackage(appRoot, entry.packageName, entry.version);
    }
    return { appRoot, packages };
}

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

describe('installed application verification', () => {
    test('verifies local origins, versions, exports, and the single standard middleware', () => {
        const fixture = writeVerifiedApp();
        const result = verifyInstalledApplication(fixture.appRoot, fixture.packages);

        expect(result.installed).toBe(true);
        expect(result.middlewareCount).toBe(1);
        expect(result.providerName).toBe('@sap-ux/mockserver-data-generator/fe-mockserver');
    });

    test('rejects a generator in legacy ui5.dependencies', () => {
        const fixture = writeVerifiedApp();
        const packageJsonPath = join(fixture.appRoot, 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        packageJson.ui5.dependencies.push('@sap-ux/mockserver-data-generator');
        writeFileSync(packageJsonPath, JSON.stringify(packageJson));

        expect(() => verifyInstalledApplication(fixture.appRoot, fixture.packages)).toThrow(/ui5\.dependencies/i);
    });

    test('rejects an installed package with a missing conditional export target', () => {
        const fixture = writeVerifiedApp();
        const packageJsonPath = join(
            fixture.appRoot,
            'node_modules',
            '@sap-ux',
            'mockserver-data-generator',
            'package.json'
        );
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        packageJson.exports = {
            '.': './dist/index.js',
            './fe-mockserver': { require: './dist/fe-mockserver.cjs' }
        };
        writeFileSync(packageJsonPath, JSON.stringify(packageJson));

        expect(() => verifyInstalledApplication(fixture.appRoot, fixture.packages)).toThrow(
            /missing a required installed export/i
        );
    });

    test('discovers metadata and first entity target without executing the start script', () => {
        const fixture = writeVerifiedApp();
        expect(discoverCanaryTarget(fixture.appRoot)).toEqual({
            servicePath: '/sap/opu/odata4/mockgen',
            metadataPath: join(fixture.appRoot, 'webapp/localService/mainService/metadata.xml'),
            entitySet: 'Products'
        });
    });

    test('discovers the first entity target from CDS metadata before starting the server', () => {
        const fixture = writeVerifiedApp();
        const metadataPath = join(fixture.appRoot, 'webapp/localService/mainService/metadata.cds');
        writeFileSync(
            metadataPath,
            'namespace MockGen.Sample;\nservice Catalog { entity Products { key ID: Integer; } }\n'
        );
        const yamlPath = join(fixture.appRoot, 'ui5-mock.yaml');
        writeFileSync(yamlPath, readFileSync(yamlPath, 'utf8').replace('metadata.xml', 'metadata.cds'));

        expect(discoverCanaryTarget(fixture.appRoot)).toEqual({
            servicePath: '/sap/opu/odata4/mockgen',
            metadataPath,
            entitySet: 'Products'
        });
    });

    test('creates an isolated debug configuration so provider evidence is observable', () => {
        const fixture = writeVerifiedApp();
        const sourcePath = join(fixture.appRoot, 'ui5-mock.yaml');
        const source = readFileSync(sourcePath, 'utf8');
        const canary = createCanaryConfiguration(fixture.appRoot);

        expect(canary.path).not.toBe(sourcePath);
        expect(readFileSync(sourcePath, 'utf8')).toBe(source);
        expect(readFileSync(canary.path, 'utf8')).toMatch(/^\s+debug: true$/mu);

        canary.cleanup();
        expect(() => readFileSync(canary.path, 'utf8')).toThrow();
    });
});
