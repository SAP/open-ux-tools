import {
    resolveWithinApp,
    resolveBasePath,
    toAppRelativePath,
    versionRequirementsNote,
    toDisplayName,
    BB_TYPE_MIN_UI5_VERSION
} from '../../../../../src/tools/functionalities/building-block/utils.js';
import { join } from 'node:path';
import type { Appdetails } from '../../../../../src/types/index.js';

describe('resolveWithinApp', () => {
    const base = '/project/app';

    test('returns a POSIX relative path for a path inside the base', () => {
        expect(resolveWithinApp(base, 'webapp/ext/Main.view.xml')).toBe('webapp/ext/Main.view.xml');
    });

    test('accepts an absolute path that stays inside the base and relativizes it', () => {
        expect(resolveWithinApp(base, '/project/app/webapp/Main.view.xml')).toBe('webapp/Main.view.xml');
    });

    test('rejects a relative path that escapes the base via ..', () => {
        expect(resolveWithinApp(base, '../../etc/passwd')).toBeUndefined();
    });

    test('rejects an absolute path outside the base', () => {
        expect(resolveWithinApp(base, '/etc/passwd')).toBeUndefined();
    });

    test('normalizes backslashes to forward slashes', () => {
        // A Windows-style separator in the client input must come back POSIX-normalized.
        expect(resolveWithinApp(base, 'webapp\\ext\\Main.view.xml')).toBe('webapp/ext/Main.view.xml');
    });
});

describe('resolveBasePath', () => {
    test('uses <projectRoot>/<appId> when applicationAccess is present', () => {
        const project = {
            root: '/project',
            appId: 'myapp',
            applicationAccess: { project: { root: '/project' } }
        } as unknown as Appdetails;
        expect(resolveBasePath(project)).toBe(join('/project', 'myapp'));
    });

    test('falls back to the project root when applicationAccess is absent', () => {
        const project = { root: '/project', appId: 'myapp' } as Appdetails;
        expect(resolveBasePath(project)).toBe('/project');
    });
});

describe('toAppRelativePath', () => {
    test('strips the app prefix and returns a POSIX relative path', () => {
        expect(toAppRelativePath('/project/app', '/project/app/webapp/ext/Main.view.xml')).toBe(
            'webapp/ext/Main.view.xml'
        );
    });

    test('normalizes Windows separators on both sides before stripping', () => {
        // find() yields native (backslash) paths on Windows and the base may use a different separator;
        // the result must still come back as a clean POSIX relative path.
        expect(toAppRelativePath('D:\\project\\app', 'D:\\project\\app\\webapp\\Main.view.xml')).toBe(
            'webapp/Main.view.xml'
        );
        expect(toAppRelativePath('D:\\project/app', 'D:\\project\\app\\webapp\\Main.view.xml')).toBe(
            'webapp/Main.view.xml'
        );
    });

    test('returns the original path unchanged when the file is outside the app', () => {
        expect(toAppRelativePath('/project/app', '/other/place/Main.view.xml')).toBe('/other/place/Main.view.xml');
    });
});

describe('toDisplayName', () => {
    test('converts kebab-case BuildingBlockType values to PascalCase', () => {
        expect(toDisplayName('filter-bar')).toBe('FilterBar');
        expect(toDisplayName('custom-filter-field')).toBe('CustomFilterField');
        expect(toDisplayName('table')).toBe('Table');
    });
});

describe('BB_TYPE_MIN_UI5_VERSION', () => {
    test('only gates RichTextEditor(/ButtonGroups) and Page — no invented floors for other types', () => {
        expect(Object.keys(BB_TYPE_MIN_UI5_VERSION).sort()).toEqual(
            ['page', 'rich-text-editor', 'rich-text-editor-button-groups'].sort()
        );
        expect(BB_TYPE_MIN_UI5_VERSION['rich-text-editor']).toEqual({ minVersion: '1.117.0' });
        expect(BB_TYPE_MIN_UI5_VERSION['page']).toEqual({ minVersion: '1.136.0', fullLayoutVersion: '1.145.0' });
    });
});

describe('versionRequirementsNote', () => {
    test('lists the real RTE and Page minimums from the writer constants', () => {
        expect(versionRequirementsNote).toContain(
            'Types requiring UI5 >= 1.117.0: RichTextEditor, RichTextEditorButtonGroups.'
        );
        expect(versionRequirementsNote).toContain('Types requiring UI5 >= 1.136.0: Page (basic).');
        expect(versionRequirementsNote).toContain('Types requiring UI5 >= 1.145.0: Page (full layout).');
    });

    test('states the universal OData V4 requirement and that other types have no specific minimum', () => {
        expect(versionRequirementsNote).toContain('All building blocks require an OData V4 service.');
        expect(versionRequirementsNote).toContain('have no specific minimum UI5 version');
        expect(versionRequirementsNote).toContain('Chart: on UI5 < 1.97');
    });
});
