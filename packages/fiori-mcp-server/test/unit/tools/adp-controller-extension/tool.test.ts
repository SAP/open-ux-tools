import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

jest.mock('@sap-ux/adp-tooling', () => ({
    getVariant: jest.fn()
}));

import { getVariant } from '@sap-ux/adp-tooling';
import { adpControllerExtension } from '../../../../src/tools/adp-controller-extension/tool.js';
import { ADP_CONTROLLER_EXTENSION_FUNCTIONALITY_ID } from '../../../../src/constant.js';

const mockedGetVariant = getVariant as jest.MockedFunction<typeof getVariant>;

function createAdpProject(layer: string = 'CUSTOMER_BASE'): string {
    const appPath = mkdtempSync(join(tmpdir(), 'adp-tool-'));
    mockedGetVariant.mockResolvedValue({
        layer,
        reference: 'sap.ui.demoapps',
        id: 'customer.adapt.demo',
        namespace: 'apps/customer.adapt.demo',
        content: []
    } as never);
    return appPath;
}

describe('adpControllerExtension', () => {
    afterEach(() => {
        mockedGetVariant.mockReset();
    });

    test('returns info envelope when appPath is missing', async () => {
        const result = await adpControllerExtension({ appPath: '' } as never);
        expect(result.status).toBe('info');
        expect(result.functionalityId).toBe(ADP_CONTROLLER_EXTENSION_FUNCTIONALITY_ID);
        expect(result.message).toContain('Missing required parameter: appPath');
    });

    test('returns error envelope when getVariant fails', async () => {
        const appPath = mkdtempSync(join(tmpdir(), 'adp-tool-err-'));
        mockedGetVariant.mockRejectedValueOnce(new Error('boom'));

        try {
            const result = await adpControllerExtension({ appPath });
            expect(result.status).toBe('error');
            expect(result.message).toContain('Failed to read manifest.appdescr_variant');
            expect(result.message).toContain('boom');
        } finally {
            rmSync(appPath, { recursive: true, force: true });
        }
    });

    test('returns knowledge base + project context when no aiResponse is provided', async () => {
        const appPath = createAdpProject('CUSTOMER_BASE');
        try {
            const result = await adpControllerExtension({ appPath, prompt: 'add a button' });
            expect(result.status).toBe('info');
            expect(result.message).toContain('Prompt received: "add a button"');
            expect(result.message).toContain('Layer: CUSTOMER_BASE');
            expect(result.message).toContain('Customer prefix required: YES');
        } finally {
            rmSync(appPath, { recursive: true, force: true });
        }
    });

    test('writes extracted files when aiResponse is provided', async () => {
        const appPath = createAdpProject('VENDOR');
        const aiResponse = [
            '**Path:** webapp/changes/coding/MyExt.js',
            '```javascript',
            '// extension',
            '```',
            '',
            '**Path:** webapp/changes/fragments/Foo.fragment.xml',
            '```xml',
            '<x/>',
            '```'
        ].join('\n');

        try {
            const result = await adpControllerExtension({ appPath, aiResponse });
            expect(result.status).toBe('success');
            expect(result.changes).toHaveLength(2);
            expect(existsSync(join(appPath, 'webapp', 'changes', 'coding', 'MyExt.js'))).toBe(true);
            expect(readFileSync(join(appPath, 'webapp', 'changes', 'coding', 'MyExt.js'), 'utf-8')).toBe(
                '// extension'
            );
        } finally {
            rmSync(appPath, { recursive: true, force: true });
        }
    });

    test('skips .change files emitted alongside code files', async () => {
        const appPath = createAdpProject();
        const aiResponse = [
            '**Path:** webapp/changes/coding/MyExt.js',
            '```javascript',
            '// real',
            '```',
            '',
            '**Path:** webapp/changes/foo.change',
            '```json',
            '{ "changeType": "x" }',
            '```'
        ].join('\n');

        try {
            const result = await adpControllerExtension({ appPath, aiResponse });
            expect(result.status).toBe('success');
            expect(result.changes).toHaveLength(1);
            expect(existsSync(join(appPath, 'webapp', 'changes', 'foo.change'))).toBe(false);
        } finally {
            rmSync(appPath, { recursive: true, force: true });
        }
    });

    test('returns skipped envelope when aiResponse contains no extractable files', async () => {
        const appPath = createAdpProject();
        try {
            const result = await adpControllerExtension({ appPath, aiResponse: 'just prose, no fences' });
            expect(result.status).toBe('skipped');
            expect(result.changes).toEqual([]);
        } finally {
            rmSync(appPath, { recursive: true, force: true });
        }
    });

    test('returns error envelope and stops on path traversal attempt', async () => {
        const appPath = createAdpProject();
        const aiResponse = ['**Path:** ../../escaped.js', '```javascript', '// nope', '```'].join('\n');

        try {
            const result = await adpControllerExtension({ appPath, aiResponse });
            expect(result.status).toBe('error');
            expect(result.message).toContain('outside the application path');
        } finally {
            rmSync(appPath, { recursive: true, force: true });
        }
    });

    test('strips aiResponse from the parameters echoed back to the caller', async () => {
        const appPath = createAdpProject();
        const aiResponse = ['**Path:** webapp/changes/coding/MyExt.js', '```js', '// x', '```'].join('\n');

        try {
            const result = await adpControllerExtension({ appPath, aiResponse, prompt: 'p' });
            expect(result.status).toBe('success');
            expect(result.parameters).toEqual({ appPath, prompt: 'p' });
            expect(JSON.stringify(result.parameters)).not.toContain('Path:');
        } finally {
            rmSync(appPath, { recursive: true, force: true });
        }
    });

    test('includes existing files in knowledge base response when webapp/changes has content', async () => {
        const appPath = createAdpProject('CUSTOMER_BASE');
        const codingDir = join(appPath, 'webapp', 'changes', 'coding');
        mkdirSync(codingDir, { recursive: true });
        writeFileSync(join(codingDir, 'MyExt.js'), '// existing extension', 'utf-8');

        try {
            const result = await adpControllerExtension({ appPath, prompt: 'test' });
            expect(result.status).toBe('info');
            expect(result.message).toContain('EXISTING PROJECT FILES');
            expect(result.message).toContain('MyExt.js');
        } finally {
            rmSync(appPath, { recursive: true, force: true });
        }
    });

    test('returns error with Failed to write file when writeFile throws a generic error', async () => {
        const appPath = createAdpProject();
        const aiResponse = ['**Path:** webapp/changes/coding/MyExt.js', '```javascript', '// code', '```'].join('\n');
        const fsMock = await import('node:fs');
        const writeFileSpy = jest.spyOn(fsMock.promises, 'writeFile').mockRejectedValueOnce(new Error('disk full'));

        try {
            const result = await adpControllerExtension({ appPath, aiResponse });
            expect(result.status).toBe('error');
            expect(result.message).toContain('Failed to write file');
        } finally {
            writeFileSpy.mockRestore();
            rmSync(appPath, { recursive: true, force: true });
        }
    });
});
