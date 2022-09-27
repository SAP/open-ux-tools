import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { addExtensionTypes } from '../../src/common/utils';

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
});
