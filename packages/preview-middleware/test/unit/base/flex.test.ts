import type { ReaderCollection } from '@ui5/fs';
import { ToolsLogger } from '@sap-ux/logger';
import { tmpdir } from 'os';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';

import { readChanges, writeChange } from '../../../src/base/flex';
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
});
