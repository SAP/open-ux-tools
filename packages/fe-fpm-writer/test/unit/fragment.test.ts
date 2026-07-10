import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateFragment } from '../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generateFragment', () => {
    let fs: Editor;
    const testFragmentDir = join(__dirname, 'sample/column');

    beforeEach(() => {
        fs = create(createStorage());
    });

    test('generate fragment with default options', async () => {
        const fragment = {
            name: 'MyFragment'
        };

        await generateFragment(testFragmentDir, fragment, fs);

        const expectedPath = join(testFragmentDir, 'webapp/ext/fragment/MyFragment.fragment.xml');
        expect(fs.exists(expectedPath)).toBe(true);
        expect(fs.read(expectedPath)).toMatchSnapshot();
    });

    test('generate fragment with custom folder', async () => {
        const fragment = {
            name: 'CustomFragment',
            folder: 'extensions/fragments'
        };

        await generateFragment(testFragmentDir, fragment, fs);

        const expectedPath = join(testFragmentDir, 'webapp/extensions/fragments/CustomFragment.fragment.xml');
        expect(fs.exists(expectedPath)).toBe(true);
        expect(fs.read(expectedPath)).toMatchSnapshot();
    });

    test('generate fragment with custom content', async () => {
        const fragment = {
            name: 'ContentFragment',
            content: '<Label text="Custom Content" />'
        };

        await generateFragment(testFragmentDir, fragment, fs);

        const expectedPath = join(testFragmentDir, 'webapp/ext/fragment/ContentFragment.fragment.xml');
        expect(fs.exists(expectedPath)).toBe(true);
        const content = fs.read(expectedPath);
        expect(content).toContain('Custom Content');
        expect(content).toMatchSnapshot();
    });

    test('generate fragment without fs parameter', async () => {
        const fragment = {
            name: 'NoFsFragment'
        };

        const resultFs = await generateFragment(testFragmentDir, fragment);

        const expectedPath = join(testFragmentDir, 'webapp/ext/fragment/NoFsFragment.fragment.xml');
        expect(resultFs.exists(expectedPath)).toBe(true);
    });

    test('do not overwrite existing fragment', async () => {
        const fragment = {
            name: 'ExistingFragment'
        };

        const expectedPath = join(testFragmentDir, 'webapp/ext/fragment/ExistingFragment.fragment.xml');
        fs.write(expectedPath, '<FragmentDefinition xmlns="sap.ui.core">Existing</FragmentDefinition>');

        await generateFragment(testFragmentDir, fragment, fs);

        expect(fs.read(expectedPath)).toContain('Existing');
    });

    describe('path validation', () => {
        test('reject absolute path (Unix-style)', async () => {
            const fragment = {
                name: 'EvilFragment',
                folder: '/etc/passwd'
            };

            await expect(generateFragment(testFragmentDir, fragment, fs)).rejects.toThrow(
                'Fragment folder must be a relative path'
            );
        });

        test('reject path traversal with ..', async () => {
            const fragment = {
                name: 'EvilFragment',
                folder: '../../../etc'
            };

            await expect(generateFragment(testFragmentDir, fragment, fs)).rejects.toThrow(
                "Fragment folder must not contain '..'"
            );
        });

        test('reject path traversal in middle of path', async () => {
            const fragment = {
                name: 'EvilFragment',
                folder: 'ext/../../../etc'
            };

            await expect(generateFragment(testFragmentDir, fragment, fs)).rejects.toThrow(
                "Fragment folder must not contain '..'"
            );
        });

        test('accept valid relative path', async () => {
            const fragment = {
                name: 'GoodFragment',
                folder: 'ext/custom/fragments'
            };

            await expect(generateFragment(testFragmentDir, fragment, fs)).resolves.toBeDefined();
        });
    });
});
