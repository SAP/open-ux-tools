import { updateManifest } from '../../src/updates';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { OdataService } from '../../src';
import { OdataVersion } from '../../src';
import * as ejs from 'ejs';

jest.mock('ejs', () => ({
    __esModule: true, // Allows mocking of ejs funcs
    ...(jest.requireActual('ejs') as {})
}));

describe('updates', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
    });

    describe('updateManifest', () => {
        test('Ensure OdataService properties are not interpretted as ejs render options', () => {
            const testManifest = {
                'sap.app': {
                    id: 'test.update.manifest'
                }
            };

            const service: OdataService = {
                version: OdataVersion.v2,
                client: '123',
                model: 'amodel',
                name: 'aname',
                path: '/a/path'
            };

            fs.writeJSON('./webapp/manifest.json', testManifest);
            const ejsMock = jest.spyOn(ejs, 'render');
            updateManifest('./', service, fs, join(__dirname, '../../templates'));
            // Passing empty options prevents ejs interpretting OdataService properties as ejs options
            expect(ejsMock).toHaveBeenCalledWith(expect.anything(), service, {});
        });
    });
});
