import type { ReaderCollection } from '@ui5/fs';
import { readChanges, writeChange } from '../../../src/base/flex';
import { ToolsLogger } from '@sap-ux/logger';
import { tmpdir } from 'os';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { deleteChange } from '../../../src/base/flex';

jest.mock('fb-watchman');
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
        function mockChange(id: string, ext: string = 'change', content?: object) {
            return {
                getPath: () => `test/changes/${id}.${ext}`,
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
            byGlobMock.mockResolvedValueOnce([mockChange('id1'), mockChange('id2', 'ctrl_variant_management_change')]);
            const changes = await readChanges(project, logger);
            expect(Object.keys(changes)).toHaveLength(2);
            expect(changes).toEqual({
                'sap.ui.fl.id1': { id: 'id1' },
                'sap.ui.fl.id2': { id: 'id2' }
            });
        });

        test('mix of valid and invalid changes', async () => {
            byGlobMock.mockResolvedValueOnce([
                mockChange('id1'), // valid
                mockChange('id2', 'change', { changeType: 'addXML' }), // valid but moduleName cannot be replaced
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
            byGlobMock.mockResolvedValueOnce([mockChange('id1', 'change', change)]);
            const changes = await readChanges(project, logger);
            expect(changes['sap.ui.fl.id1'].moduleName).toBe('my/app/changes/controller/MyExtension');
        });

        test('xml fragment change with missing module name', async () => {
            const change = {
                changeType: 'addXML',
                reference: 'my.app',
                content: {
                    fragmentPath: 'fragment/MyFragment.xml'
                }
            };
            byGlobMock.mockResolvedValueOnce([mockChange('id1', 'change', change)]);
            const changes = await readChanges(project, logger);
            expect(changes['sap.ui.fl.id1'].moduleName).toBe('my/app/changes/fragment/MyFragment.xml');
        });
    });

    describe('writeChange', () => {
        test('valid change', () => {
            const change = { fileName: 'id', fileType: 'ctrl_variant' };
            const result = writeChange(change, path, logger);
            expect(result.success).toBe(true);
            expect(result.message).toBeDefined();
            expect(
                JSON.parse(readFileSync(join(path, 'changes', `${change.fileName}.${change.fileType}`), 'utf-8'))
            ).toEqual(change);
        });

        test('invalid change', () => {
            const result = writeChange({}, path, logger);
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
