import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { writeCdsWatchScript } from '../../../src/common/cap-utils.js';

const CAP_ROOT = '/cap-root';

describe('writeCdsWatchScript', () => {
    test('writes cds watch script to CAP root package.json', () => {
        const fs = create(createStorage());
        fs.writeJSON(join(CAP_ROOT, 'package.json'), { name: 'cap-project' });

        writeCdsWatchScript(CAP_ROOT, 'start-cards-generator-my_app', 'ns.myapp/test/flpCards.html#app-preview', fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        expect((pkg.scripts as Record<string, string>)['start-cards-generator-my_app']).toBe(
            'cds watch --open "ns.myapp/test/flpCards.html#app-preview"'
        );
    });

    test('preserves existing scripts', () => {
        const fs = create(createStorage());
        fs.writeJSON(join(CAP_ROOT, 'package.json'), {
            name: 'cap-project',
            scripts: { 'watch-my_app': 'cds watch --open my_app/webapp/index.html' }
        });

        writeCdsWatchScript(CAP_ROOT, 'start-cards-generator-my_app', 'ns.myapp/test/flpCards.html#app-preview', fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        const scripts = pkg.scripts as Record<string, string>;
        expect(scripts['watch-my_app']).toBe('cds watch --open my_app/webapp/index.html');
        expect(scripts['start-cards-generator-my_app']).toBeDefined();
    });

    test('throws when CAP root package.json does not exist', () => {
        const fs = create(createStorage());

        expect(() =>
            writeCdsWatchScript(CAP_ROOT, 'start-cards-generator-my_app', 'ns.myapp/test/flpCards.html', fs)
        ).toThrow(`package.json not found at CAP root: ${CAP_ROOT}`);
    });
});
