import { enableCardEditor } from '../src';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

function createTestFs(basePath: string, ovp?: boolean) {
    const fs = create(createStorage());
    fs.writeJSON(join(basePath, 'webapp/manifest.json'), {
        'sap.app': {
            id: 'test.id',
            title: 'Test App'
        },
        'sap.ovp': ovp ? {} : undefined
    });
    fs.writeJSON(join(basePath, 'package.json'), {});
    fs.write(join(basePath, 'ui5.yaml'), '');
    return fs;
}

describe('enableCardEditor', () => {
    test('Valid LROP', async () => {
        const basePath = '.tmp/lrop';
        const fs = createTestFs(basePath);
        await enableCardEditor(basePath, fs);

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('Valid OVP', async () => {
        const basePath = '.tmp/ovp';
        const fs = createTestFs(basePath, true);
        await enableCardEditor(basePath, fs);

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('V4 LROP with CLI 3.0', async () => {
        const basePath = join(__dirname, 'fixtures/lrop-v4');
        const fs = create(createStorage());
        await enableCardEditor(basePath, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });
});
