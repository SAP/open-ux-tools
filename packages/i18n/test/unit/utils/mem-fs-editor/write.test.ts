import type { Editor } from 'mem-fs-editor';
import { writeFile } from '../../../../src/utils';
import * as fs from 'fs';

describe('write', () => {
    describe('writeFile', () => {
        const filePath = 'absolute-path-to-a-file';
        const content = 'some-content';
        test('mem-fs-editor', async () => {
            const writeSpy = jest.fn().mockReturnValue(content);
            const promiseWriteFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
            const editor = { write: writeSpy } as unknown as Editor;

            const result = await writeFile(filePath, content, editor);
            expect(result).toEqual('some-content');
            expect(writeSpy).toHaveBeenNthCalledWith(1, filePath, content);
            expect(promiseWriteFileSpy).toHaveBeenCalledTimes(0);
        });
        test('promises.readFile', async () => {
            const promiseReadFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();

            const result = await writeFile(filePath, content);
            expect(result).toEqual(undefined);
            expect(promiseReadFileSpy).toHaveBeenNthCalledWith(1, filePath, content, { encoding: 'utf8' });
        });
    });
});
