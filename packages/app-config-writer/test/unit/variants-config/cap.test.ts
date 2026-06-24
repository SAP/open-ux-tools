import { jest } from '@jest/globals';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const { updateCapRootPackageJsonForVariants } = await import('../../../src/variants-config/cap.js');

const CAP_ROOT = '/cap-root';
const APP_PATH = join(CAP_ROOT, 'app', 'my_app');
const APP_ID = 'ns.myapp';
const APP_FOLDER_NAME = 'my_app';

function createTestFs(rtaPath = '/my-variants.html') {
    const fs = create(createStorage());
    fs.write(
        join(APP_PATH, 'ui5.yaml'),
        `specVersion: "3.0"
metadata:
  name: my_app
type: application
server:
  customMiddleware:
    - name: preview-middleware
      afterMiddleware: compression
      configuration:
        flp:
          intent:
            object: hello
            action: world
        rta:
          layer: VENDOR
          editors:
            - path: /editor.html
              developerMode: true
            - path: ${rtaPath}
`
    );
    fs.writeJSON(join(APP_PATH, 'package.json'), {
        name: 'my-app',
        devDependencies: { '@sap-ux/preview-middleware': '0.17.0' }
    });
    fs.writeJSON(join(CAP_ROOT, 'package.json'), { name: 'cap-project', dependencies: { '@sap/cds': '7.0.0' } });
    return fs;
}

describe('updateCapRootPackageJsonForVariants', () => {
    test('writes cds watch script to CAP root package.json', async () => {
        const fs = createTestFs();

        await updateCapRootPackageJsonForVariants(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        const scripts = pkg.scripts as Record<string, string>;
        expect(scripts['start-variants-management-my_app']).toBe(
            'cds watch --open "ns.myapp/my-variants.html#hello-world"'
        );
    });

    test('uses appFolderName as script key suffix', async () => {
        const fs = createTestFs();
        fs.writeJSON(join(CAP_ROOT, 'package.json'), { name: 'cap-project' });

        await updateCapRootPackageJsonForVariants(CAP_ROOT, APP_ID, 'another_app', APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        expect((pkg.scripts as Record<string, string>)['start-variants-management-another_app']).toBeDefined();
    });

    test('preserves existing scripts in CAP root package.json', async () => {
        const fs = createTestFs();
        fs.writeJSON(join(CAP_ROOT, 'package.json'), {
            name: 'cap-project',
            scripts: { 'watch-my_app': 'cds watch --open my_app/webapp/index.html' }
        });

        await updateCapRootPackageJsonForVariants(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        const scripts = pkg.scripts as Record<string, string>;
        expect(scripts['watch-my_app']).toBe('cds watch --open my_app/webapp/index.html');
        expect(scripts['start-variants-management-my_app']).toBeDefined();
    });

    test('throws when CAP root package.json does not exist', async () => {
        const fs = create(createStorage());

        await expect(
            updateCapRootPackageJsonForVariants(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs)
        ).rejects.toThrow(`package.json not found at CAP root: ${CAP_ROOT}`);
    });

    test('throws when no RTA editor specified in ui5.yaml', async () => {
        const fs = create(createStorage());
        fs.write(
            join(APP_PATH, 'ui5.yaml'),
            `specVersion: "3.0"
metadata:
  name: my_app
type: application
server:
  customMiddleware:
    - name: preview-middleware
      afterMiddleware: compression
      configuration:
        flp:
          intent:
            object: hello
            action: world
`
        );
        fs.writeJSON(join(APP_PATH, 'package.json'), { name: 'my-app' });
        fs.writeJSON(join(CAP_ROOT, 'package.json'), { name: 'cap-project' });

        await expect(
            updateCapRootPackageJsonForVariants(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs)
        ).rejects.toThrow(
            `Script 'start-variants-management-my_app' cannot be written to package.json. No RTA editor specified in ui5.yaml.`
        );
    });
});
