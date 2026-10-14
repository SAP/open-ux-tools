import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { join } from 'node:path';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { updateExtConfigJson } from '../../../src/components/extension.js';
import { createMemFsEditor, runWithEditor } from '../../../src/utils/fs-adapter.js';
import type { ImportProjectInfo } from '../../../src/types.js';

describe('components/extension', () => {
    const testRoot = join(tmpdir(), 'extension-test-' + Date.now());

    beforeEach(() => {
        mkdirSync(testRoot, { recursive: true });
    });

    afterEach(() => {
        rmSync(testRoot, { recursive: true, force: true });
    });

    /**
     * Helper to commit mem-fs changes
     */
    async function commitEditor(fs: ReturnType<typeof createMemFsEditor>): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            fs.commit((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    describe('updateExtConfigJson', () => {
        it('should write .extconfig.json file with extension settings', async () => {
            const projectInfo = {
                extensionProjectSettings: {
                    system: {
                        name: 'originalDest',
                        description: 'Original connection'
                    }
                }
            } as unknown as ImportProjectInfo;

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                await updateExtConfigJson(testRoot, projectInfo);
                await commitEditor(fs);
            });

            const extConfigPath = join(testRoot, '.extconfig.json');
            expect(existsSync(extConfigPath)).toBe(true);
            const content = JSON.parse(readFileSync(extConfigPath, 'utf-8')) as Record<string, unknown>;
            expect((content.system as Record<string, unknown>).name).toBe('originalDest');
        });

        it('should replace webidedispatcher paths in extension settings', async () => {
            const projectInfo = {
                extensionProjectSettings: {
                    system: {
                        name: 'testDest',
                        uri: '/webidedispatcher/destinations/myDest/sap/opu/odata'
                    }
                }
            } as unknown as ImportProjectInfo;

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                await updateExtConfigJson(testRoot, projectInfo);
                await commitEditor(fs);
            });

            const extConfigPath = join(testRoot, '.extconfig.json');
            const content = JSON.parse(readFileSync(extConfigPath, 'utf-8')) as Record<string, unknown>;
            // Verify webidedispatcher path was replaced with /destinations/
            expect((content.system as Record<string, unknown>).uri).toBe('/destinations/myDest/sap/opu/odata');
        });

        it('should update destination when provided and different from original', async () => {
            const projectInfo = {
                extensionProjectSettings: {
                    system: {
                        name: 'originalDest',
                        description: 'Original connection',
                        systemId: 'OLD_SYS'
                    },
                    discoveryStatus: {
                        description: 'Original connection'
                    }
                },
                destination: 'newDestination',
                sapClient: '100'
            } as unknown as ImportProjectInfo;

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                await updateExtConfigJson(testRoot, projectInfo);
                await commitEditor(fs);
            });

            const extConfigPath = join(testRoot, '.extconfig.json');
            const content = JSON.parse(readFileSync(extConfigPath, 'utf-8')) as Record<string, unknown>;
            const system = content.system as Record<string, unknown>;
            const discoveryStatus = content.discoveryStatus as Record<string, unknown>;
            expect(system.name).toBe('newDestination');
            expect(system.sapClient).toBe('100');
            expect(system.description).toBe('newDestination connection');
            expect(discoveryStatus.description).toBe('newDestination connection');
            // systemId should be removed
            expect(system.systemId).toBeUndefined();
        });

        it('should update destination paths in nested strings', async () => {
            const projectInfo = {
                extensionProjectSettings: {
                    system: {
                        name: 'originalDest',
                        uri: '/destinations/originalDest/sap/opu/odata'
                    }
                },
                destination: 'newDest'
            } as unknown as ImportProjectInfo;

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                await updateExtConfigJson(testRoot, projectInfo);
                await commitEditor(fs);
            });

            const extConfigPath = join(testRoot, '.extconfig.json');
            const content = JSON.parse(readFileSync(extConfigPath, 'utf-8')) as Record<string, unknown>;
            expect((content.system as Record<string, unknown>).uri).toBe('/destinations/newDest/sap/opu/odata');
        });

        it('should handle extensionProjectSettings without webidedispatcher paths', async () => {
            const projectInfo = {
                extensionProjectSettings: { system: { name: 'test' } }
            } as unknown as ImportProjectInfo;

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                await updateExtConfigJson(testRoot, projectInfo);
                await commitEditor(fs);
            });

            const extConfigPath = join(testRoot, '.extconfig.json');
            expect(existsSync(extConfigPath)).toBe(true);
        });

        it('should not update destination when same as original', async () => {
            const projectInfo = {
                extensionProjectSettings: {
                    system: {
                        name: 'sameDest',
                        description: 'Original connection'
                    }
                },
                destination: 'sameDest'
            } as unknown as ImportProjectInfo;

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                await updateExtConfigJson(testRoot, projectInfo);
                await commitEditor(fs);
            });

            const extConfigPath = join(testRoot, '.extconfig.json');
            const content = JSON.parse(readFileSync(extConfigPath, 'utf-8')) as Record<string, unknown>;
            // Should remain unchanged since destination matches
            expect((content.system as Record<string, unknown>).description).toBe('Original connection');
        });

        it('should handle missing system in extensionProjectSettings', async () => {
            const projectInfo = {
                extensionProjectSettings: {
                    // no system property
                    otherProp: 'value'
                },
                destination: 'newDest'
            } as unknown as ImportProjectInfo;

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                await updateExtConfigJson(testRoot, projectInfo);
                await commitEditor(fs);
            });

            const extConfigPath = join(testRoot, '.extconfig.json');
            const content = JSON.parse(readFileSync(extConfigPath, 'utf-8')) as Record<string, unknown>;
            // Should write file without modification since no system property
            expect(content.otherProp).toBe('value');
        });

        it('should handle sapClient being undefined', async () => {
            const projectInfo = {
                extensionProjectSettings: {
                    system: {
                        name: 'originalDest'
                    }
                },
                destination: 'newDest'
                // sapClient is undefined
            } as unknown as ImportProjectInfo;

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                await updateExtConfigJson(testRoot, projectInfo);
                await commitEditor(fs);
            });

            const extConfigPath = join(testRoot, '.extconfig.json');
            const content = JSON.parse(readFileSync(extConfigPath, 'utf-8')) as Record<string, unknown>;
            expect((content.system as Record<string, unknown>).sapClient).toBe('');
        });
    });
});
