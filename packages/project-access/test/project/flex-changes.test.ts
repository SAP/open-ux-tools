import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { DirName, readFlexChanges } from '../../src';

describe('Test readFlexChanges()', () => {
    test('Changes exists', async () => {
        const changesPath = join(
            __dirname,
            '..',
            'test-data',
            'project',
            'flex-changes',
            DirName.Webapp,
            DirName.Changes
        );
        const memFs = create(createStorage());
        const files = await readFlexChanges(changesPath, memFs);
        expect(Object.keys(files).sort()).toEqual([
            'id_1761320220775_1_propertyChange.change',
            'id_1761320220775_2_propertyChange.change'
        ]);
        expect(files['id_1761320220775_1_propertyChange.change']).toEqual(
            await memFs.read(join(changesPath, 'id_1761320220775_1_propertyChange.change'))
        );
    });

    test('Directory does not exist', async () => {
        const changesPath = join(
            __dirname,
            '..',
            'test-data',
            'project',
            'flex-changes-404',
            DirName.Webapp,
            DirName.Changes
        );
        const files = await readFlexChanges(changesPath);
        expect(Object.keys(files)).toEqual([]);
    });
});
