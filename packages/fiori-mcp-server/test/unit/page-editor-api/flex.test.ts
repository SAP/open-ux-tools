import { basename, join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { mergeChanges, writeFlexChanges } from '../../../src/page-editor-api/flex';
import { generateFlexChanges } from '../utils';
import { readFile } from 'node:fs/promises';
import type { FlexChange } from '../../../src/page-editor-api';

describe('flex', () => {
    const changesPath = join(__dirname, 'test-data', 'flex-changes');
    describe('Test writeFlexChanges()', () => {
        const existingFilePath1 = join(__dirname, 'test-data/flex-changes/id_1761320220775_1_propertyChange.change');
        const existingFilePath2 = join(__dirname, 'test-data/flex-changes/id_1761320220775_2_propertyChange.change');
        const existingFiles: { [key: string]: object } = {};
        beforeAll(async () => {
            existingFiles[existingFilePath1] = JSON.parse(await readFile(existingFilePath1, 'utf8'));
            existingFiles[existingFilePath2] = JSON.parse(await readFile(existingFilePath2, 'utf8'));
        });

        const getMemFsResult = (memFsInstance: Editor): { [key: string]: 'modified' | 'deleted' } => {
            const result: { [key: string]: 'modified' | 'deleted' } = {};
            const changes = memFsInstance.dump?.();
            for (const file in changes) {
                const absolutePath = join(__dirname, '../../../', file);
                result[absolutePath] = changes[file].state;
            }
            return result;
        };

        test('New change file', async () => {
            const memFs = create(createStorage());
            const fileName = 'id_1761320220775_3_propertyChange';
            const flexChange = generateFlexChanges(fileName, {
                'property': 'visible',
                'newValue': false
            });
            const newFilePath = join(changesPath, fileName);
            const editor = await writeFlexChanges(
                changesPath,
                {
                    ...existingFiles,
                    [newFilePath]: flexChange
                },
                memFs
            );
            expect(editor).toEqual(memFs);
            expect(getMemFsResult(memFs)).toEqual({
                [newFilePath]: 'modified'
            });
        });

        test('Deletion of files', async () => {
            const memFs = create(createStorage());
            await writeFlexChanges(changesPath, {}, memFs);
            expect(getMemFsResult(memFs)).toEqual({
                [existingFilePath1]: 'deleted',
                [existingFilePath2]: 'deleted'
            });
        });

        test('Test optional memFs', async () => {
            const editor = await writeFlexChanges(changesPath, {});
            expect(getMemFsResult(editor)).toEqual({
                [existingFilePath1]: 'deleted',
                [existingFilePath2]: 'deleted'
            });
        });

        test('Unchanged', async () => {
            const memFs = create(createStorage());
            await writeFlexChanges(changesPath, { ...existingFiles }, memFs);
            expect(getMemFsResult(memFs)).toEqual({});
        });
    });

    describe('Test mergeChanges()', () => {
        const existingFilePath1 = join(__dirname, 'test-data/flex-changes/id_1761320220775_1_propertyChange.change');
        const existingFilePath2 = join(__dirname, 'test-data/flex-changes/id_1761320220775_2_propertyChange.change');
        const existingFiles: { [key: string]: string } = {};
        beforeAll(async () => {
            existingFiles[basename(existingFilePath1)] = await readFile(existingFilePath1, 'utf8');
            existingFiles[basename(existingFilePath2)] = await readFile(existingFilePath2, 'utf8');
        });

        test('Unchanged', async () => {
            const changes = mergeChanges(changesPath, existingFiles, []);
            expect(Object.keys(changes)).toEqual([existingFilePath1, existingFilePath2]);
        });

        test('New change file', async () => {
            const fileName = 'id_1761320220775_3_propertyChange';
            const newFilePath = join(changesPath, fileName);
            const flexChange = generateFlexChanges(fileName, {
                'property': 'visible',
                'newValue': false
            });
            const changes = mergeChanges(changesPath, existingFiles, [JSON.stringify(flexChange)]);
            expect(Object.keys(changes)).toEqual([`${newFilePath}.change`, existingFilePath1, existingFilePath2]);
            const change = changes[`${newFilePath}.change`] as FlexChange;
            expect(change.content).toEqual({
                'property': 'visible',
                'newValue': false
            });
        });

        test('Existing change file modification - change has same file name', async () => {
            const fileName = 'id_1761320220775_1_propertyChange';
            const flexChange = generateFlexChanges(fileName, {
                'property': 'hAlign',
                'newValue': 'Left'
            });
            const changes = mergeChanges(changesPath, existingFiles, [JSON.stringify(flexChange)]);
            expect(Object.keys(changes)).toEqual([existingFilePath2, existingFilePath1]);
            const change = changes[existingFilePath2] as FlexChange;
            expect(change.content).toEqual({
                'property': 'hAlign',
                'newValue': 'Left'
            });
        });

        test('Existing property modification - change has different file name', async () => {
            const fileName = 'id_1761320220775_5_propertyChange';
            const flexChange = generateFlexChanges(fileName, {
                'property': 'hAlign',
                'newValue': 'Left'
            });
            const changes = mergeChanges(changesPath, existingFiles, [JSON.stringify(flexChange)]);
            expect(Object.keys(changes)).toEqual([existingFilePath2, existingFilePath1]);
            const change = changes[existingFilePath2] as FlexChange;
            expect(change.content).toEqual({
                'property': 'hAlign',
                'newValue': 'Left'
            });
        });

        test('Existing change file modification - change binding value', async () => {
            const fileName = 'id_1761320220775_1_propertyChange';
            const flexChange = generateFlexChanges(
                fileName,
                {
                    'property': 'width',
                    'newBinding': '{dummy}'
                },
                undefined,
                'propertyBindingChange'
            );
            const changes = mergeChanges(changesPath, existingFiles, [JSON.stringify(flexChange)]);
            expect(Object.keys(changes)).toEqual([existingFilePath1, existingFilePath2]);
            const change = changes[existingFilePath1] as FlexChange;
            expect(change.content).toEqual({
                'property': 'width',
                'newBinding': '{dummy}'
            });
        });

        test('Existing property modification - matching value', async () => {
            const fileName = 'id_1761320220775_5_propertyChange';
            const flexChange = generateFlexChanges(fileName, {
                'property': 'hAlign',
                'newValue': 'Center'
            });
            const changes = mergeChanges(changesPath, existingFiles, [JSON.stringify(flexChange)]);
            expect(Object.keys(changes)).toEqual([existingFilePath1, existingFilePath2]);
            const change = changes[existingFilePath2] as FlexChange;
            expect(change.content).toEqual({
                'property': 'hAlign',
                'newValue': 'Center'
            });
        });

        test('Existing property modification - matching binding', async () => {
            const fileName = 'id_1761320220775_5_propertyChange';
            const flexChange = generateFlexChanges(fileName, {
                'property': 'hAlign',
                'newBinding': '{width}'
            });
            const changes = mergeChanges(changesPath, existingFiles, [JSON.stringify(flexChange)]);
            expect(Object.keys(changes)).toEqual([existingFilePath2, existingFilePath1]);
            const change = changes[existingFilePath2] as FlexChange;
            expect(change.content).toEqual({
                'property': 'hAlign',
                'newBinding': '{width}'
            });
        });

        test('Remove duplicates', async () => {
            const duplicateName = 'id_1761320220775_3_propertyChange';
            const tempExistingFiles = { ...existingFiles };
            const duplicateChange = JSON.parse(tempExistingFiles[basename(existingFilePath1)]);
            duplicateChange.fileName = duplicateName;
            tempExistingFiles[`${duplicateName}.change`] = JSON.stringify(duplicateChange);

            const fileName = 'id_1761320220775_1_propertyChange';
            const flexChange = generateFlexChanges(
                fileName,
                {
                    'property': 'width',
                    'newValue': '100%'
                },
                undefined,
                'propertyBindingChange'
            );
            const changes = mergeChanges(changesPath, tempExistingFiles, [JSON.stringify(flexChange)]);
            expect(Object.keys(changes)).toEqual([existingFilePath1, existingFilePath2]);
        });
    });
});
