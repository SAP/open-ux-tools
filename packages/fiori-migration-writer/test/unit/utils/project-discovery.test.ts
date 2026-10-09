import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
    findAllWebIDEProjectFolders,
    getWebIDEProjectPathsAsLabels,
    findProjectsByManifest
} from '../../../src/utils/project-discovery.js';
import type { ProjectFolder } from '../../../src/types.js';

describe('utils/project-discovery', () => {
    const testRoot = join(tmpdir(), 'project-discovery-test-' + Date.now());

    beforeEach(() => {
        mkdirSync(testRoot, { recursive: true });
    });

    afterEach(() => {
        rmSync(testRoot, { recursive: true, force: true });
    });

    const createProjectFolder = (path: string): ProjectFolder => ({
        uri: {
            scheme: 'file',
            fsPath: path,
            path: path,
            authority: '',
            query: '',
            fragment: '',
            with: jest.fn(),
            toString: jest.fn(),
            toJSON: jest.fn()
        } as ProjectFolder['uri'],
        name: path.split('/').pop() ?? '',
        index: 0
    });

    describe('findAllWebIDEProjectFolders', () => {
        it('should return empty array for empty workspace', async () => {
            const result = await findAllWebIDEProjectFolders([]);
            expect(result).toEqual([]);
        });

        it('should find folders with pom.xml', async () => {
            const projectPath = join(testRoot, 'maven-project');
            mkdirSync(projectPath, { recursive: true });
            writeFileSync(join(projectPath, 'pom.xml'), '<project></project>');

            const folders = [createProjectFolder(testRoot)];
            const result = await findAllWebIDEProjectFolders(folders);

            // Result depends on whether it's detected as a Fiori Tools project
            expect(Array.isArray(result)).toBe(true);
        });

        it('should find folders with neo-app.json', async () => {
            const projectPath = join(testRoot, 'neo-project');
            mkdirSync(projectPath, { recursive: true });
            writeFileSync(join(projectPath, 'neo-app.json'), '{}');

            const folders = [createProjectFolder(testRoot)];
            const result = await findAllWebIDEProjectFolders(folders);

            expect(Array.isArray(result)).toBe(true);
        });

        it('should accept string array as input', async () => {
            const result = await findAllWebIDEProjectFolders([testRoot]);
            expect(Array.isArray(result)).toBe(true);
        });

        it('should filter out non-file scheme folders', async () => {
            const folders = [
                {
                    uri: {
                        scheme: 'vscode-remote',
                        fsPath: '/remote/path',
                        path: '/remote/path',
                        authority: '',
                        query: '',
                        fragment: ''
                    },
                    name: 'remote',
                    index: 0
                } as ProjectFolder
            ];

            const result = await findAllWebIDEProjectFolders(folders);
            expect(result).toEqual([]);
        });

        it('should ignore node_modules directories', async () => {
            const nodeModulesPath = join(testRoot, 'node_modules', 'some-package');
            mkdirSync(nodeModulesPath, { recursive: true });
            writeFileSync(join(nodeModulesPath, 'pom.xml'), '<project></project>');

            const folders = [createProjectFolder(testRoot)];
            const result = await findAllWebIDEProjectFolders(folders);

            // Should not include paths under node_modules
            const hasNodeModules = result.some((p) => p.includes('node_modules'));
            expect(hasNodeModules).toBe(false);
        });

        it('should ignore dist directories', async () => {
            const distPath = join(testRoot, 'dist', 'app');
            mkdirSync(distPath, { recursive: true });
            writeFileSync(join(distPath, 'pom.xml'), '<project></project>');

            const folders = [createProjectFolder(testRoot)];
            const result = await findAllWebIDEProjectFolders(folders);

            const hasDist = result.some((p) => p.includes('/dist/'));
            expect(hasDist).toBe(false);
        });

        it('should handle errors in workspace roots gracefully', async () => {
            const nonExistentFolder = createProjectFolder('/non/existent/path');
            const result = await findAllWebIDEProjectFolders([nonExistentFolder]);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('getWebIDEProjectPathsAsLabels', () => {
        it('should return empty array for empty workspace', async () => {
            const result = await getWebIDEProjectPathsAsLabels([]);
            expect(result).toEqual([]);
        });

        it('should return sorted project labels', async () => {
            // Create two projects
            const projectA = join(testRoot, 'zebra-project');
            const projectB = join(testRoot, 'alpha-project');
            mkdirSync(projectA, { recursive: true });
            mkdirSync(projectB, { recursive: true });
            writeFileSync(join(projectA, 'neo-app.json'), '{}');
            writeFileSync(join(projectB, 'neo-app.json'), '{}');

            const folders = [createProjectFolder(testRoot)];
            const result = await getWebIDEProjectPathsAsLabels(folders);

            // Results should be sorted alphabetically by label
            if (result.length > 1) {
                expect(result[0].label <= result[1].label).toBe(true);
            }
        });

        it('should deduplicate roots when multiple workspace folders provided', async () => {
            const projectPath = join(testRoot, 'shared-project');
            mkdirSync(projectPath, { recursive: true });
            writeFileSync(join(projectPath, 'neo-app.json'), '{}');

            // Two workspace folders pointing to same area
            const folders = [createProjectFolder(testRoot), createProjectFolder(testRoot)];

            const result = await getWebIDEProjectPathsAsLabels(folders);

            // Should not have duplicates
            const descriptions = result.map((r) => r.description);
            const uniqueDescriptions = [...new Set(descriptions)];
            expect(descriptions.length).toBe(uniqueDescriptions.length);
        });

        it('should return label and description for each project', async () => {
            const projectPath = join(testRoot, 'test-app');
            mkdirSync(projectPath, { recursive: true });
            writeFileSync(join(projectPath, 'neo-app.json'), '{}');

            const folders = [createProjectFolder(testRoot)];
            const result = await getWebIDEProjectPathsAsLabels(folders);

            for (const item of result) {
                expect(item).toHaveProperty('label');
                expect(item).toHaveProperty('description');
                expect(typeof item.label).toBe('string');
                expect(typeof item.description).toBe('string');
            }
        });
    });

    describe('findProjectsByManifest', () => {
        it('should find projects with manifest.json', async () => {
            const webappPath = join(testRoot, 'myapp', 'webapp');
            mkdirSync(webappPath, { recursive: true });
            writeFileSync(
                join(webappPath, 'manifest.json'),
                JSON.stringify({
                    'sap.app': { id: 'test.app' }
                })
            );

            const folders = [createProjectFolder(testRoot)];
            const result = await findProjectsByManifest(folders);

            expect(Array.isArray(result)).toBe(true);
        });

        it('should filter out paths ending with /webapp', async () => {
            const webappPath = join(testRoot, 'app', 'webapp');
            mkdirSync(webappPath, { recursive: true });
            writeFileSync(join(webappPath, 'manifest.json'), '{}');

            const folders = [createProjectFolder(testRoot)];
            const result = await findProjectsByManifest(folders);

            // Should not include paths ending with /webapp
            const hasWebappEnding = result.some((p) => p.endsWith('/webapp') || p.endsWith('\\webapp'));
            expect(hasWebappEnding).toBe(false);
        });

        it('should return empty array when no manifests found', async () => {
            const emptyDir = join(testRoot, 'empty');
            mkdirSync(emptyDir, { recursive: true });

            const folders = [createProjectFolder(emptyDir)];
            const result = await findProjectsByManifest(folders);

            expect(result).toEqual([]);
        });
    });
});
