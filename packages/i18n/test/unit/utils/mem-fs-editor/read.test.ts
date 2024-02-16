import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { readFile } from '../../../../src/utils';
import * as fs from 'fs';

describe('read', () => {
    describe('readFile', () => {
        const filePath = 'absolute-path-to-a-file';
        test('mem-fs-editor', async () => {
            const promiseReadFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('promise-mock-content');
            const memFs = create(createStorage());
            const readSpy = jest.spyOn(memFs, 'read').mockReturnValue('mock-content' as any);

            const result = await readFile(filePath, memFs);
            expect(result).toEqual('mock-content');
            expect(readSpy).toHaveBeenNthCalledWith(1, filePath);
            expect(promiseReadFileSpy).toHaveBeenCalledTimes(0);
        });
        test('promises.readFile', async () => {
            const promiseReadFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('promise-mock-content');

            const result = await readFile(filePath);
            expect(result).toEqual('promise-mock-content');
            expect(promiseReadFileSpy).toHaveBeenNthCalledWith(1, filePath, { encoding: 'utf8' });
        });
    });
});
