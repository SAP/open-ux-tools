// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { ReaderCollection } from '@ui5/fs';
import { ToolsLogger } from '@sap-ux/logger';
import { tmpdir } from 'node:os';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';

import {
    readChanges,
    writeChange,
    readLocalModulePaths,
    stripLocalModulesFromLrepResponse,
    deleteChange
} from '../../../src/base/flex.js';

describe('flex', () => {
    const logger = new ToolsLogger();
    const path = join(tmpdir(), Date.now().toString());
    function mockChange(id: string, subfolderPath: string = '', ext: string = 'change', content?: object) {
        return {
            getPath: () => `test/changes/${subfolderPath}/${id}.${ext}`,
            getName: () => `${id}.${ext}`,
            getString: () => Promise.resolve(JSON.stringify(content ?? { id }))
        };
    }
    beforeAll(() => {
        mkdirSync(path);
        mkdirSync(join(path, 'changes'));
    });

    describe('readChanges', () => {
        const byGlobMock = jest.fn();
        const project = {
            byGlob: byGlobMock
        } as unknown as ReaderCollection;
        test('no changes available', async () => {
            byGlobMock.mockResolvedValueOnce([]);
            const changes = await readChanges(project, logger);
            expect(changes).toEqual({});
        });

        test('valid changes', async () => {
            byGlobMock.mockResolvedValueOnce([
                mockChange('id1'),
                mockChange('id2', '', 'ctrl_variant_management_change'),
                mockChange('id3', 'manifest', 'appdescr_app_addAnnotationsToOData')
            ]);
            const changes = await readChanges(project, logger);
            expect(Object.keys(changes)).toHaveLength(3);
            expect(changes).toEqual({
                'sap.ui.fl.id1': { id: 'id1' },
                'sap.ui.fl.id2': { id: 'id2' },
                'sap.ui.fl.id3': { id: 'id3' }
            });
        });

        test('mix of valid and invalid changes', async () => {
            byGlobMock.mockResolvedValueOnce([
                mockChange('id1'), // valid
                mockChange('id2', '', 'change', { changeType: 'addXML' }), // valid, no fragmentPath
                { invalid: 'change' } // invalid
            ]);
            const changes = await readChanges(project, logger);
            expect(Object.keys(changes)).toHaveLength(2);
            expect(changes['sap.ui.fl.id2'].moduleName).toBeUndefined();
        });

        test('controller extension change with missing module name', async () => {
            const change = {
                changeType: 'codeExt',
                reference: 'my.app',
                content: {
                    codeRef: 'controller/MyExtension.js'
                }
            };
            byGlobMock.mockResolvedValueOnce([mockChange('id1', '', 'change', change)]);
            const changes = await readChanges(project, logger);
            expect(changes['sap.ui.fl.id1'].changeType).toBe('codeExt');
        });

        test('xml fragment change with missing module name', async () => {
            const change = {
                changeType: 'addXML',
                reference: 'my.app',
                content: {
                    fragmentPath: 'fragment/MyFragment.xml'
                }
            };
            byGlobMock.mockResolvedValueOnce([mockChange('id1', '', 'change', change)]);
            const changes = await readChanges(project, logger);
            expect(changes['sap.ui.fl.id1'].changeType).toBe('addXML');
        });
    });

    describe('writeChange', () => {
        test('valid change', () => {
            const change = { fileName: 'id', fileType: 'ctrl_variant' };
            const writeSpy = jest.fn();
            const fsMock = { writeJSON: writeSpy };
            const result = writeChange(change, path, fsMock as unknown as Editor, logger);
            expect(result.success).toBe(true);
            expect(result.message).toBeDefined();
            expect(writeSpy).toHaveBeenCalledWith(
                join(path, 'changes', `${change.fileName}.${change.fileType}`),
                change
            );
        });

        test('invalid change', () => {
            const result = writeChange({}, path, {} as Editor, logger);
            expect(result.success).toBe(false);
        });
    });

    describe('deleteChange', () => {
        test('existing change', () => {
            const changeId = 'mychange';
            const fullPath = join(path, 'changes', `${changeId}.change`);
            writeFileSync(fullPath, JSON.stringify({ hello: 'world' }));
            const result = deleteChange({ fileName: `sap.ui.fl.${changeId}` }, path, logger);
            expect(result.success).toBe(true);
            expect(result.message).toBeDefined();
            expect(existsSync(fullPath)).toBe(false);
        });

        test('change in subdirectory', () => {
            const subdir = join(path, 'changes', 'annotations');
            mkdirSync(subdir, { recursive: true });
            const changeId = 'subchange';
            const fullPath = join(subdir, `${changeId}.change`);
            writeFileSync(fullPath, JSON.stringify({}));
            const result = deleteChange({ fileName: `sap.ui.fl.${changeId}` }, path, logger);
            expect(result.success).toBe(true);
            expect(existsSync(fullPath)).toBe(false);
        });

        test('returns failure when change file is not found in directory', () => {
            const result = deleteChange({ fileName: 'sap.ui.fl.doesnotexist' }, path, logger);
            expect(result.success).toBe(false);
        });

        test('returns failure when changes directory does not exist', () => {
            const result = deleteChange({ fileName: 'sap.ui.fl.anychange' }, join(tmpdir(), 'no-such-dir'), logger);
            expect(result.success).toBe(false);
        });

        test('returns failure when fileName is missing', () => {
            const result = deleteChange({}, path, logger);
            expect(result.success).toBe(false);
        });
    });

    describe('readLocalModulePaths', () => {
        const byGlobMock = jest.fn();
        const project = {
            byGlob: byGlobMock
        } as unknown as ReaderCollection;

        afterEach(() => {
            byGlobMock.mockReset();
        });

        function mockFile(path: string) {
            return { getPath: () => path };
        }

        test('no local modules - both sets empty', async () => {
            byGlobMock.mockResolvedValue([]);
            const result = await readLocalModulePaths(project, logger);
            expect(result.active.size).toBe(0);
            expect(result.orphaned.size).toBe(0);
        });

        test('change files with addXML and codeExt - paths go into active', async () => {
            byGlobMock
                .mockResolvedValueOnce([
                    mockChange('id1', '', 'change', {
                        changeType: 'addXML',
                        content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
                    }),
                    mockChange('id2', '', 'change', {
                        changeType: 'codeExt',
                        content: { codeRef: 'coding/MyController.js' }
                    })
                ])
                .mockResolvedValueOnce([
                    mockFile('test/changes/fragments/MyFragment.fragment.xml'),
                    mockFile('test/changes/coding/MyController.js')
                ]);

            const result = await readLocalModulePaths(project, logger);
            expect(result.active).toEqual(new Set(['fragments/MyFragment.fragment.xml', 'coding/MyController.js']));
            expect(result.orphaned.size).toBe(0);
        });

        test('local files without change records become orphaned', async () => {
            byGlobMock
                .mockResolvedValueOnce([]) // no change files
                .mockResolvedValueOnce([
                    mockFile('test/changes/fragments/fr1.xml'),
                    mockFile('test/changes/fragments/fr2.xml')
                ]);

            const result = await readLocalModulePaths(project, logger);
            expect(result.active.size).toBe(0);
            expect(result.orphaned).toEqual(new Set(['fragments/fr1.xml', 'fragments/fr2.xml']));
        });

        test('mix: active change files and orphaned local files', async () => {
            byGlobMock
                .mockResolvedValueOnce([
                    mockChange('id1', '', 'change', {
                        changeType: 'addXML',
                        content: { fragmentPath: 'fragments/fr3.xml' }
                    })
                ])
                .mockResolvedValueOnce([
                    mockFile('test/changes/fragments/fr1.xml'),
                    mockFile('test/changes/fragments/fr2.xml'),
                    mockFile('test/changes/fragments/fr3.xml')
                ]);

            const result = await readLocalModulePaths(project, logger);
            expect(result.active).toEqual(new Set(['fragments/fr3.xml']));
            expect(result.orphaned).toEqual(new Set(['fragments/fr1.xml', 'fragments/fr2.xml']));
        });

        test('normalises .ts controller files to .js in orphaned set', async () => {
            byGlobMock
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([mockFile('test/changes/coding/MyController.ts')]);

            const result = await readLocalModulePaths(project, logger);
            expect(result.orphaned).toEqual(new Set(['coding/MyController.js']));
        });

        test('ignores change files without addXML or codeExt type', async () => {
            byGlobMock
                .mockResolvedValueOnce([
                    mockChange('id1', '', 'change', { changeType: 'propertyChange', content: {} }),
                    mockChange('id2', '', 'change', {
                        changeType: 'addXML',
                        content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
                    })
                ])
                .mockResolvedValueOnce([mockFile('test/changes/fragments/MyFragment.fragment.xml')]);

            const result = await readLocalModulePaths(project, logger);
            expect(result.active).toEqual(new Set(['fragments/MyFragment.fragment.xml']));
            expect(result.orphaned.size).toBe(0);
        });

        test('ignores addXML changes without fragmentPath', async () => {
            byGlobMock
                .mockResolvedValueOnce([mockChange('id1', '', 'change', { changeType: 'addXML', content: {} })])
                .mockResolvedValueOnce([]);

            const result = await readLocalModulePaths(project, logger);
            expect(result.active.size).toBe(0);
        });

        test('module file path without /changes/ segment is skipped', async () => {
            byGlobMock
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([mockFile('/some/other/dir/fragments/MyFragment.xml')]);

            const result = await readLocalModulePaths(project, logger);
            expect(result.orphaned.size).toBe(0);
        });
    });

    describe('stripLocalModulesFromLrepResponse', () => {
        const localModuleState = {
            active: new Set(['fragments/MyFragment.fragment.xml', 'coding/MyController.js']),
            orphaned: new Set<string>()
        };

        test('no local modules - returns response unchanged', () => {
            const emptyState = { active: new Set<string>(), orphaned: new Set<string>() };
            const responseData = {
                changes: [{ fileName: 'id_addXML_1' }],
                modules: { 'ns/app/changes/fragments/MyFragment.fragment.xml': '<xml/>' }
            };

            const result = stripLocalModulesFromLrepResponse(responseData, emptyState, logger);
            expect(result).toBe(responseData);
        });

        test('strips inlined modules even when response has no changes array', () => {
            const responseData = {
                modules: {
                    'my/app/changes/fragments/MyFragment.fragment.xml': '<deployed/>',
                    'my/app/changes/fragments/Other.fragment.xml': '<other/>'
                }
            };
            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            expect(result.modules).toEqual({ 'my/app/changes/fragments/Other.fragment.xml': '<other/>' });
        });

        test('orphaned paths exist but no deployed changes reference them - response unchanged', () => {
            const stateWithOrphaned = {
                active: new Set<string>(),
                orphaned: new Set(['fragments/fr1.xml'])
            };
            const responseData = {
                changes: [{ fileName: 'id_prop', changeType: 'propertyChange', reference: 'my.app', content: {} }]
            };
            const result = stripLocalModulesFromLrepResponse(responseData, stateWithOrphaned, logger);
            expect(result).toBe(responseData);
        });

        test('strips inlined modules that exist locally', () => {
            const responseData = {
                changes: [],
                modules: {
                    'my/app/changes/fragments/MyFragment.fragment.xml': '<deployed-xml/>',
                    'my/app/changes/coding/MyController.js': 'deployed-code',
                    'my/app/changes/fragments/OtherFragment.fragment.xml': '<other-xml/>'
                }
            };

            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            expect(result.modules).toEqual({
                'my/app/changes/fragments/OtherFragment.fragment.xml': '<other-xml/>'
            });
        });

        test('preserves non-local modules', () => {
            const responseData = {
                changes: [{ fileName: 'id_baseApp_1', changeType: 'propertyChange' }],
                modules: {
                    'base/app/Component.js': 'component-code'
                },
                otherProperty: 'preserved'
            };

            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            expect(result.modules).toEqual({ 'base/app/Component.js': 'component-code' });
            expect(result.otherProperty).toBe('preserved');
        });

        test('handles response without modules property - still sets moduleName on local changes', () => {
            const responseData = {
                changes: [
                    {
                        fileName: 'id_addXML_1',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
                    }
                ],
                settings: {}
            };
            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            expect((result.changes as { moduleName: string }[])[0].moduleName).toBe(
                'my/app/changes/fragments/MyFragment.fragment.xml'
            );
        });

        test('sets moduleName on addXML deployed changes with local files', () => {
            const responseData = {
                changes: [
                    {
                        fileName: 'id_addXML_1',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
                    },
                    {
                        fileName: 'id_property_1',
                        changeType: 'propertyChange',
                        reference: 'my.app',
                        content: {}
                    }
                ]
            };

            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            const changes = result.changes as { moduleName?: string; changeType: string }[];
            expect(changes[0].moduleName).toBe('my/app/changes/fragments/MyFragment.fragment.xml');
            expect(changes[1].moduleName).toBeUndefined();
        });

        test('sets moduleName on codeExt deployed changes with local files (strips .js)', () => {
            const responseData = {
                changes: [
                    {
                        fileName: 'id_codeExt_1',
                        changeType: 'codeExt',
                        reference: 'my.app',
                        content: { codeRef: 'coding/MyController.js' }
                    }
                ]
            };

            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            const changes = result.changes as { moduleName: string }[];
            expect(changes[0].moduleName).toBe('my/app/changes/coding/MyController');
        });

        test('does not modify change when moduleName is already correct', () => {
            const change = {
                fileName: 'id_addXML_1',
                changeType: 'addXML',
                reference: 'my.app',
                content: { fragmentPath: 'fragments/MyFragment.fragment.xml' },
                moduleName: 'my/app/changes/fragments/MyFragment.fragment.xml'
            };
            const responseData = { changes: [change] };

            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            expect(result).toBe(responseData);
        });

        test('does not set moduleName when change has no reference', () => {
            const responseData = {
                changes: [
                    {
                        fileName: 'id_addXML_1',
                        changeType: 'addXML',
                        content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
                    }
                ]
            };

            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            expect(result).toBe(responseData);
        });

        test('does not set moduleName for changes without local files', () => {
            const responseData = {
                changes: [
                    {
                        fileName: 'id_addXML_2',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/DeployedOnly.fragment.xml' }
                    }
                ]
            };

            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            expect(result).toBe(responseData);
        });

        test('strips loadModules flag to prevent ABAP modules bundle from populating cache', () => {
            const responseData = {
                changes: [
                    {
                        fileName: 'id_addXML_1',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
                    }
                ],
                loadModules: true
            };

            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            expect(result.loadModules).toBeUndefined();
        });

        test('does not strip loadModules when no local modules match', () => {
            const emptyState = { active: new Set<string>(), orphaned: new Set<string>() };
            const responseData = { changes: [], loadModules: true };

            const result = stripLocalModulesFromLrepResponse(responseData, emptyState, logger);
            expect(result).toBe(responseData);
            expect(result.loadModules).toBe(true);
        });

        test('does not strip loadModules when only orphaned modules exist (no active)', () => {
            const orphanedOnlyState = {
                active: new Set<string>(),
                orphaned: new Set(['fragments/fr1.xml'])
            };
            const responseData = {
                changes: [
                    {
                        fileName: 'id_fr1',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/fr1.xml' }
                    }
                ],
                loadModules: true
            };

            const result = stripLocalModulesFromLrepResponse(responseData, orphanedOnlyState, logger);
            // orphaned change is suppressed but loadModules must stay — no active modules need on-demand loading
            expect(result.loadModules).toBe(true);
            expect((result.changes as unknown[]).length).toBe(0);
        });

        test('applies both inline-module stripping and moduleName injection', () => {
            const responseData = {
                changes: [
                    {
                        fileName: 'id_addXML_1',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
                    }
                ],
                modules: {
                    'my/app/changes/fragments/MyFragment.fragment.xml': '<deployed/>',
                    'my/app/changes/fragments/Other.fragment.xml': '<other/>'
                }
            };

            const result = stripLocalModulesFromLrepResponse(responseData, localModuleState, logger);
            // Inline module for local file should be stripped
            expect(result.modules).toEqual({ 'my/app/changes/fragments/Other.fragment.xml': '<other/>' });
            // moduleName should be set on the change
            const changes = result.changes as { moduleName: string }[];
            expect(changes[0].moduleName).toBe('my/app/changes/fragments/MyFragment.fragment.xml');
        });

        test('suppresses deployed addXML change when local file is orphaned (change file deleted)', () => {
            const stateWithOrphaned = {
                active: new Set<string>(),
                orphaned: new Set(['fragments/fr1.xml', 'fragments/fr2.xml'])
            };
            const responseData = {
                changes: [
                    {
                        fileName: 'id_fr1',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/fr1.xml' }
                    },
                    {
                        fileName: 'id_fr2',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/fr2.xml' }
                    },
                    {
                        fileName: 'id_property',
                        changeType: 'propertyChange',
                        reference: 'my.app',
                        content: {}
                    }
                ]
            };

            const result = stripLocalModulesFromLrepResponse(responseData, stateWithOrphaned, logger);
            const changes = result.changes as { fileName: string }[];
            expect(changes).toHaveLength(1);
            expect(changes[0].fileName).toBe('id_property');
        });

        test('suppresses deployed codeExt change when local controller file is orphaned', () => {
            const stateWithOrphaned = {
                active: new Set<string>(),
                orphaned: new Set(['coding/MyController.js'])
            };
            const responseData = {
                changes: [
                    {
                        fileName: 'id_codeExt',
                        changeType: 'codeExt',
                        reference: 'my.app',
                        content: { codeRef: 'coding/MyController.js' }
                    }
                ]
            };

            const result = stripLocalModulesFromLrepResponse(responseData, stateWithOrphaned, logger);
            expect((result.changes as unknown[]).length).toBe(0);
        });

        test('active and orphaned work together: active gets moduleName, orphaned gets suppressed', () => {
            const mixedState = {
                active: new Set(['fragments/fr3.xml']),
                orphaned: new Set(['fragments/fr1.xml', 'fragments/fr2.xml'])
            };
            const responseData = {
                changes: [
                    {
                        fileName: 'id_fr1',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/fr1.xml' }
                    },
                    {
                        fileName: 'id_fr2',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/fr2.xml' }
                    },
                    {
                        fileName: 'id_fr3',
                        changeType: 'addXML',
                        reference: 'my.app',
                        content: { fragmentPath: 'fragments/fr3.xml' }
                    }
                ]
            };

            const result = stripLocalModulesFromLrepResponse(responseData, mixedState, logger);
            const changes = result.changes as { fileName: string; moduleName?: string }[];
            expect(changes).toHaveLength(1);
            expect(changes[0].fileName).toBe('id_fr3');
            expect(changes[0].moduleName).toBe('my/app/changes/fragments/fr3.xml');
        });
    });
});
