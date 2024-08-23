import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { writeFile } from '../../../../src/utils';
import * as fs from 'fs';

describe('write', () => {
    describe('writeFile', () => {
        const filePath = 'absolute-path-to-a-file';
        const content = 'some-content';
        test('mem-fs-editor', async () => {
            const promiseWriteFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
            const memFs = create(createStorage());
            const writeSpy = jest.spyOn(memFs, 'write').mockReturnValue(content);

            const result = await writeFile(filePath, content, memFs);
            expect(result).toEqual('some-content');
            expect(writeSpy).toHaveBeenNthCalledWith(1, filePath, content);
            expect(promiseWriteFileSpy).toHaveBeenCalledTimes(0);
        });
        test('promises.readFile', async () => {
            const promiseWriteFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();

            const result = await writeFile(filePath, content);
            expect(result).toEqual(undefined);
            expect(promiseWriteFileSpy).toHaveBeenNthCalledWith(1, filePath, content, { encoding: 'utf8' });
        });
    });
});
