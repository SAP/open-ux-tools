import { jest } from '@jest/globals';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const { updateCapRootPackageJsonForCards } = await import('../../../src/cards-config/cap.js');

const CAP_ROOT = '/cap-root';
const APP_PATH = join(CAP_ROOT, 'app', 'my_app');
const APP_ID = 'ns.myapp';
const APP_FOLDER_NAME = 'my_app';

function createTestFs(options?: { cardGeneratorPath?: string }) {
    const fs = create(createStorage());
    const cardGeneratorPath = options?.cardGeneratorPath ?? '/test/flpCardGeneratorSandbox.html';
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
        editors:
          cardGenerator:
            path: ${cardGeneratorPath}
`
    );
    fs.writeJSON(join(CAP_ROOT, 'package.json'), { name: 'cap-project' });
    return fs;
}

describe('updateCapRootPackageJsonForCards', () => {
    test('writes cds watch script to CAP root package.json with default path and intent', async () => {
        const fs = createTestFs();

        await updateCapRootPackageJsonForCards(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        expect((pkg.scripts as Record<string, string>)['start-cards-generator-my_app']).toBe(
            'cds watch --open "ns.myapp/test/flpCardGeneratorSandbox.html#app-preview"'
        );
    });

    test('writes cds watch script with custom card generator path from yaml', async () => {
        const fs = createTestFs({ cardGeneratorPath: '/test/myCustomCardGen.html' });

        await updateCapRootPackageJsonForCards(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        expect((pkg.scripts as Record<string, string>)['start-cards-generator-my_app']).toBe(
            'cds watch --open "ns.myapp/test/myCustomCardGen.html#app-preview"'
        );
    });

    test('uses appFolderName as script key suffix', async () => {
        const fs = createTestFs();

        await updateCapRootPackageJsonForCards(CAP_ROOT, APP_ID, 'another_app', APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        expect((pkg.scripts as Record<string, string>)['start-cards-generator-another_app']).toBeDefined();
    });

    test('preserves existing scripts in CAP root package.json', async () => {
        const fs = createTestFs();
        fs.writeJSON(join(CAP_ROOT, 'package.json'), {
            name: 'cap-project',
            scripts: { 'watch-my_app': 'cds watch --open my_app/webapp/index.html' }
        });

        await updateCapRootPackageJsonForCards(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        const scripts = pkg.scripts as Record<string, string>;
        expect(scripts['watch-my_app']).toBe('cds watch --open my_app/webapp/index.html');
        expect(scripts['start-cards-generator-my_app']).toBeDefined();
    });

    test('throws when CAP root package.json does not exist', async () => {
        const fs = create(createStorage());

        await expect(
            updateCapRootPackageJsonForCards(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs)
        ).rejects.toThrow(`package.json not found at CAP root: ${CAP_ROOT}`);
    });
});
