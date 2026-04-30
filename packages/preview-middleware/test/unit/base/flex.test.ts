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
    stripLocalModulesFromLrepResponse
} from '../../../src/base/flex';
import { deleteChange } from '../../../dist/base/flex';

describe('flex', () => {
    const logger = new ToolsLogger();
    const path = join(tmpdir(), Date.now().toString());
    beforeAll(() => {
        mkdirSync(path);
        mkdirSync(join(path, 'changes'));
    });

    describe('readChanges', () => {
        const byGlobMock = jest.fn();
        const project = {
            byGlob: byGlobMock
        } as unknown as ReaderCollection;
        function mockChange(id: string, subfolderPath: string = '', ext: string = 'change', content?: object) {
            return {
                getPath: () => `test/changes/${subfolderPath}/${id}.${ext}`,
                getName: () => `${id}.${ext}`,
                getString: () => Promise.resolve(JSON.stringify(content ?? { id }))
            };
        }
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
                mockChange('id2', '', 'change', { changeType: 'addXML' }), // valid but moduleName cannot be replaced
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
    });

    describe('readLocalModulePaths', () => {
        const byGlobMock = jest.fn();
        const project = {
            byGlob: byGlobMock
        } as unknown as ReaderCollection;

        afterEach(() => {
            byGlobMock.mockReset();
        });

        test('no local modules', async () => {
            byGlobMock.mockResolvedValue([]);
            const result = await readLocalModulePaths(project, logger);
            expect(result.size).toBe(0);
        });

        test('local fragments and controllers', async () => {
            byGlobMock.mockResolvedValueOnce([
                { getPath: () => '/webapp/changes/fragments/MyFragment.fragment.xml' },
                { getPath: () => '/webapp/changes/coding/MyController.js' }
            ]);

            const result = await readLocalModulePaths(project, logger);
            expect(result).toEqual(new Set(['fragments/MyFragment.fragment.xml', 'coding/MyController.js']));
        });

        test('paths without /changes/ prefix are ignored', async () => {
            byGlobMock.mockResolvedValueOnce([{ getPath: () => '/webapp/other/MyFile.xml' }]);

            const result = await readLocalModulePaths(project, logger);
            expect(result.size).toBe(0);
        });
    });

    describe('stripLocalModulesFromLrepResponse', () => {
        const localModulePaths = new Set(['fragments/MyFragment.fragment.xml', 'coding/MyController.js']);

        test('no local modules - returns response unchanged', () => {
            const emptyPaths = new Set<string>();
            const responseData = {
                changes: [{ fileName: 'id_addXML_1' }],
                modules: { 'ns/app/changes/fragments/MyFragment.fragment.xml': '<xml/>' }
            };

            const result = stripLocalModulesFromLrepResponse(responseData, emptyPaths, logger);
            expect(result).toBe(responseData);
        });

        test('changes are preserved (UI5 deduplicates by fileName)', () => {
            const responseData = {
                changes: [
                    { fileName: 'id_addXML_1', changeType: 'addXML' },
                    { fileName: 'id_baseApp_1', changeType: 'propertyChange' }
                ]
            };

            const result = stripLocalModulesFromLrepResponse(responseData, localModulePaths, logger);
            expect(result.changes).toEqual(responseData.changes);
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

            const result = stripLocalModulesFromLrepResponse(responseData, localModulePaths, logger);
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

            const result = stripLocalModulesFromLrepResponse(responseData, localModulePaths, logger);
            expect(result.modules).toEqual({ 'base/app/Component.js': 'component-code' });
            expect(result.otherProperty).toBe('preserved');
        });

        test('handles response without modules property', () => {
            const responseData = { changes: [], settings: {} };
            const result = stripLocalModulesFromLrepResponse(responseData, localModulePaths, logger);
            expect(result).toBe(responseData);
        });
    });
});
