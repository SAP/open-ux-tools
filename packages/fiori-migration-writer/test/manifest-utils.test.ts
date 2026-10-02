import { describe, test, expect, beforeAll } from '@jest/globals';
import { readManifest, getUI5Version, initI18n } from '../src/index.js';
import { join } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('Manifest and Version Utils', () => {
    const testRoot = join(tmpdir(), 'manifest-utils-test-' + Date.now());

    beforeAll(async () => {
        await initI18n();
        mkdirSync(testRoot, { recursive: true });
    });

    afterAll(() => {
        rmSync(testRoot, { recursive: true, force: true });
    });

    describe('readManifest', () => {
        test('should read and parse manifest.json', async () => {
            const manifest = {
                '_version': '1.12.0',
                'sap.app': {
                    id: 'test.app',
                    applicationVersion: { version: '1.0.0' }
                },
                'sap.ui5': {
                    dependencies: {
                        minUI5Version: '1.120.0'
                    }
                }
            };

            const appDir = join(testRoot, 'app1');
            mkdirSync(appDir, { recursive: true });
            const manifestPath = join(appDir, 'manifest.json');
            writeFileSync(manifestPath, JSON.stringify(manifest));

            const result = await readManifest(testRoot, 'app1');
            expect(result).toEqual(manifest);
            expect(result?.['sap.app'].id).toBe('test.app');
        });
    });

    describe('getUI5Version', () => {
        test('should normalize UI5 version', () => {
            expect(getUI5Version('1.120.5')).toBe('1.120.5');
            expect(getUI5Version(' 1.120.5 ')).toBe('1.120.5');
        });

        test('should upgrade very old UI5 versions', () => {
            expect(getUI5Version('1.38.50')).toBe('1.38.59');
            expect(getUI5Version('1.30.0')).toBe('1.38.59');
        });

        test('should handle latest and empty values', () => {
            expect(getUI5Version('latest')).toBe('');
            expect(getUI5Version('')).toBe('');
            expect(getUI5Version(undefined)).toBe('');
        });

        test('should handle snapshot versions', () => {
            expect(getUI5Version('snapshot')).toBe('snapshot');
        });
    });
});
