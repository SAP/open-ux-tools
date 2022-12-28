import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { addExtensionTypes } from '../../src/common/utils';
import { detectTabSpacing } from '../../src/common/file';

describe('Common', () => {
    describe('utils.addExtensionTypes', () => {
        const basePath = join(__dirname, 'temp');
        const dtsFile = join(basePath, 'webapp/ext/sap.fe.d.ts');

        test('versions that do NOT require a d.ts file', () => {
            const fs = create(createStorage());
            addExtensionTypes(basePath, '1.102.3', fs);
            expect(fs.exists(dtsFile)).toBe(false);
            addExtensionTypes(basePath, '1.108.3', fs);
            expect(fs.exists(dtsFile)).toBe(false);
        });

        test('versions that require a d.ts file', () => {
            const fs = create(createStorage());
            addExtensionTypes(basePath, '1.101.3', fs);
            expect(fs.exists(dtsFile)).toBe(true);
            fs.delete(dtsFile);
            addExtensionTypes(basePath, '1.105.3', fs);
            expect(fs.exists(dtsFile)).toBe(true);
        });

        test('file exits already, nothing to be done', () => {
            const fs = create(createStorage());
            const content = 'HelloWorld';
            fs.write(dtsFile, content);
            addExtensionTypes(basePath, '1.102.3', fs);
            expect(fs.exists(dtsFile)).toBe(true);
            expect(fs.read(dtsFile)).toBe(content);
        });

        test('invalid versions should not result in a d.ts file', () => {
            const fs = create(createStorage());
            addExtensionTypes(basePath, undefined, fs);
            expect(fs.exists(dtsFile)).toBe(false);
            addExtensionTypes(basePath, '', fs);
            expect(fs.exists(dtsFile)).toBe(false);
            addExtensionTypes(basePath, 'SNAPSHOT', fs);
            expect(fs.exists(dtsFile)).toBe(false);
        });
    });

    describe('file.detectTabSpacing', () => {
        const testCases = [
            {
                name: 'Empty content',
                content: '',
                result: undefined
            },
            {
                name: '4 spaces',
                content: '{\n    "dummy": true\n}',
                result: {
                    'size': 4,
                    'useTabSymbol': false
                }
            },
            {
                name: '1 tab',
                content: '{\n\t"dummy": true\n}',
                result: {
                    'size': 1,
                    'useTabSymbol': true
                }
            },
            {
                name: '2 tabs',
                content: '{\n\t\t"dummy": true\n}',
                result: {
                    'size': 2,
                    'useTabSymbol': true
                }
            }
        ];
        test.each(testCases)('$name', (testsCase) => {
            const tabInfo = detectTabSpacing(testsCase.content);
            expect(tabInfo).toEqual(testsCase.result);
        });
    });
});
