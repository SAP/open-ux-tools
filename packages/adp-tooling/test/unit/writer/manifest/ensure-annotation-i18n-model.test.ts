import { jest } from '@jest/globals';
import { join } from 'node:path';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

const actualProjectAccess = await import('@sap-ux/project-access');
const mockGetWebappPath = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    getWebappPath: mockGetWebappPath
}));

const { ensureAnnotationI18nModelContent, ensureAnnotationI18nModelRegistered } =
    await import('../../../../src/writer/manifest/ensure-annotation-i18n-model.js');

interface DescriptorChange {
    changeType: string;
    content: { modelId?: string; createIfMissing?: boolean };
    texts?: object;
}

describe('ensureAnnotationI18nModelRegistered', () => {
    const projectPath = '/mock/project';
    const webappPath = join(projectPath, 'webapp');
    const descriptorPath = join(webappPath, 'manifest.appdescr_variant');
    let fs: Editor;

    const i18nModelChanges = (): DescriptorChange[] => {
        const descriptor = fs.readJSON(descriptorPath) as { content: DescriptorChange[] };
        return descriptor.content.filter(
            (c) => c.changeType === 'appdescr_ui5_addNewModelEnhanceWith' && c.content?.modelId === '@i18n'
        );
    };

    beforeEach(() => {
        jest.resetAllMocks();
        mockGetWebappPath.mockResolvedValue(webappPath);
        fs = create(createStorage());
    });

    it('should append a fresh @i18n model when none exists', async () => {
        fs.writeJSON(descriptorPath, {
            content: [{ changeType: 'appdescr_app_setTitle', content: {} }]
        });

        const modified = await ensureAnnotationI18nModelRegistered(projectPath, fs);

        expect(modified).toBe(true);
        const changes = i18nModelChanges();
        expect(changes).toHaveLength(1);
        expect(changes[0]).toEqual({
            changeType: 'appdescr_ui5_addNewModelEnhanceWith',
            content: { modelId: '@i18n', createIfMissing: true },
            texts: { i18n: 'i18n/i18n.properties' }
        });
    });

    it('should enhance an existing @i18n entry with createIfMissing instead of duplicating', async () => {
        fs.writeJSON(descriptorPath, {
            content: [
                {
                    changeType: 'appdescr_ui5_addNewModelEnhanceWith',
                    content: { modelId: '@i18n' },
                    texts: { i18n: 'i18n/i18n.properties' }
                }
            ]
        });

        const modified = await ensureAnnotationI18nModelRegistered(projectPath, fs);

        expect(modified).toBe(true);
        const changes = i18nModelChanges();
        expect(changes).toHaveLength(1);
        expect(changes[0].content.createIfMissing).toBe(true);
    });

    it('should be a no-op when @i18n already has createIfMissing', async () => {
        fs.writeJSON(descriptorPath, {
            content: [
                {
                    changeType: 'appdescr_ui5_addNewModelEnhanceWith',
                    content: { modelId: '@i18n', createIfMissing: true },
                    texts: { i18n: 'i18n/i18n.properties' }
                }
            ]
        });

        const modified = await ensureAnnotationI18nModelRegistered(projectPath, fs);

        expect(modified).toBe(false);
        expect(i18nModelChanges()).toHaveLength(1);
    });

    it('should ignore addNewModelEnhanceWith entries for other model IDs', async () => {
        fs.writeJSON(descriptorPath, {
            content: [
                {
                    changeType: 'appdescr_ui5_addNewModelEnhanceWith',
                    content: { modelId: 'i18n' },
                    texts: { i18n: 'i18n/i18n.properties' }
                }
            ]
        });

        const modified = await ensureAnnotationI18nModelRegistered(projectPath, fs);

        expect(modified).toBe(true);
        expect(i18nModelChanges()).toHaveLength(1);
    });

    it('should return false when the descriptor does not exist', async () => {
        const modified = await ensureAnnotationI18nModelRegistered(projectPath, fs);

        expect(modified).toBe(false);
    });

    it('should return false when the descriptor has no content array', async () => {
        fs.writeJSON(descriptorPath, { fileName: 'manifest' });

        const modified = await ensureAnnotationI18nModelRegistered(projectPath, fs);

        expect(modified).toBe(false);
    });
});

describe('ensureAnnotationI18nModelContent', () => {
    it('should append a fresh @i18n model when none exists', () => {
        const content: DescriptorChange[] = [{ changeType: 'appdescr_app_setTitle', content: {} }];

        const modified = ensureAnnotationI18nModelContent(content);

        expect(modified).toBe(true);
        expect(content).toHaveLength(2);
        expect(content[1]).toEqual({
            changeType: 'appdescr_ui5_addNewModelEnhanceWith',
            content: { modelId: '@i18n', createIfMissing: true },
            texts: { i18n: 'i18n/i18n.properties' }
        });
    });

    it('should enhance an existing @i18n entry with createIfMissing instead of duplicating', () => {
        const content: DescriptorChange[] = [
            {
                changeType: 'appdescr_ui5_addNewModelEnhanceWith',
                content: { modelId: '@i18n' },
                texts: { i18n: 'i18n/i18n.properties' }
            }
        ];

        const modified = ensureAnnotationI18nModelContent(content);

        expect(modified).toBe(true);
        expect(content).toHaveLength(1);
        expect(content[0].content).toEqual({ modelId: '@i18n', createIfMissing: true });
    });

    it('should be a no-op when @i18n already has createIfMissing', () => {
        const content: DescriptorChange[] = [
            {
                changeType: 'appdescr_ui5_addNewModelEnhanceWith',
                content: { modelId: '@i18n', createIfMissing: true },
                texts: { i18n: 'i18n/i18n.properties' }
            }
        ];

        const modified = ensureAnnotationI18nModelContent(content);

        expect(modified).toBe(false);
        expect(content).toHaveLength(1);
    });

    it('should ignore addNewModelEnhanceWith entries for other model IDs', () => {
        const content: DescriptorChange[] = [
            {
                changeType: 'appdescr_ui5_addNewModelEnhanceWith',
                content: { modelId: 'i18n' },
                texts: { i18n: 'i18n/i18n.properties' }
            }
        ];

        const modified = ensureAnnotationI18nModelContent(content);

        expect(modified).toBe(true);
        expect(content).toHaveLength(2);
        expect((content[1].content as { modelId?: string }).modelId).toBe('@i18n');
    });
});
