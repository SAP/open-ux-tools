import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';

import { getWebappPath } from '../../src';

describe('Test getWebappPath()', () => {
    const samplesRoot = join(__dirname, '..', 'test-data', 'project', 'webapp-path');

    test('Get webapp from default app', async () => {
        expect(await getWebappPath(join(samplesRoot, 'default-webapp-path'))).toEqual(
            join(samplesRoot, 'default-webapp-path', 'webapp')
        );
    });

    test('Get webapp from default app with ui5.yaml that does not contain a custom mapping', async () => {
        expect(await getWebappPath(join(samplesRoot, 'default-with-ui5-yaml'))).toEqual(
            join(samplesRoot, 'default-with-ui5-yaml', 'webapp')
        );
    });

    test('Get webapp from app with custom webapp mapping', async () => {
        expect(await getWebappPath(join(samplesRoot, 'custom-webapp-path'))).toEqual(
            join(samplesRoot, 'custom-webapp-path', 'src', 'webapp')
        );
    });

    test('Get webapp from app with custom webapp mapping in multi document yaml', async () => {
        expect(await getWebappPath(join(samplesRoot, 'custom-webapp-path-multi-yaml'))).toEqual(
            join(samplesRoot, 'custom-webapp-path-multi-yaml', 'src', 'webapp')
        );
    });

    test('Get custom webapp path from mem-fs editor instance', async () => {
        const memFs = create(createStorage());
        memFs.write(
            join(samplesRoot, 'custom-webapp-path/ui5.yaml'),
            'resources:\n  configuration:\n    paths:\n      webapp: new/webapp/path'
        );
        expect(await getWebappPath(join(samplesRoot, 'custom-webapp-path'), memFs)).toEqual(
            join(samplesRoot, 'custom-webapp-path/new/webapp/path')
        );
    });
});
