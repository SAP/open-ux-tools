import { jest } from '@jest/globals';
import { TemplateType } from '../../src/types.js';

const mockGenerateOPAFiles = jest.fn() as jest.Mock;
const mockApplyCAPUpdates = jest.fn() as jest.Mock;
const mockGenerateAnnotations = jest.fn() as jest.Mock;

jest.unstable_mockModule('@sap-ux/ui5-test-writer', () => ({
    generateOPAFiles: mockGenerateOPAFiles
}));

jest.unstable_mockModule('@sap-ux/cap-config-writer', () => ({
    applyCAPUpdates: mockApplyCAPUpdates
}));

jest.unstable_mockModule('@sap-ux/annotation-generator', () => ({
    generateAnnotations: mockGenerateAnnotations
}));

jest.unstable_mockModule('read-pkg-up', () => ({
    default: { sync: jest.fn().mockReturnValue({ packageJson: { name: 'mocked', version: '9.9.9-mocked' } }) },
    sync: jest.fn().mockReturnValue({ packageJson: { name: 'mocked', version: '9.9.9-mocked' } })
}));

const { generate } = await import('../../src/index.js');
const { applyBaseConfigToFEApp, v4Service, v4TemplateSettings } = await import('../common.js');
const { initI18n } = await import('../../src/i18n.js');

describe('generate — ui5Version forwarding to generateOPAFiles', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGenerateOPAFiles.mockResolvedValue({});
    });

    it('forwards feApp.ui5.version as ui5Version when addTests is true and version < 1.150', async () => {
        const config = applyBaseConfigToFEApp('opaVersionTest_184', TemplateType.ListReportObjectPage);
        config.ui5 = { ...config.ui5, version: '1.120.0' };
        config.appOptions = { ...config.appOptions, addTests: true };
        config.service = { ...v4Service };
        config.template = { type: TemplateType.ListReportObjectPage, settings: v4TemplateSettings };

        await generate('/test/opaVersionTest_184', config);

        expect(mockGenerateOPAFiles).toHaveBeenCalledWith(
            '/test/opaVersionTest_184',
            expect.objectContaining({ ui5Version: '1.120.0' }),
            expect.anything(),
            expect.anything(),
            undefined
        );
    });

    it('forwards feApp.ui5.version as ui5Version when version >= 1.150', async () => {
        const config = applyBaseConfigToFEApp('opaVersionTest_1150', TemplateType.ListReportObjectPage);
        config.ui5 = { ...config.ui5, version: '1.150.0' };
        config.appOptions = { ...config.appOptions, addTests: true };
        config.service = { ...v4Service };
        config.template = { type: TemplateType.ListReportObjectPage, settings: v4TemplateSettings };

        await generate('/test/opaVersionTest_1150', config);

        expect(mockGenerateOPAFiles).toHaveBeenCalledWith(
            '/test/opaVersionTest_1150',
            expect.objectContaining({ ui5Version: '1.150.0' }),
            expect.anything(),
            expect.anything(),
            undefined
        );
    });

    it('forwards empty string ui5Version when feApp.ui5.version is not set (defaults to 1.150 bucket)', async () => {
        const config = applyBaseConfigToFEApp('opaVersionTest_noui5', TemplateType.ListReportObjectPage);
        config.ui5 = { ...config.ui5, version: undefined };
        config.appOptions = { ...config.appOptions, addTests: true };
        config.service = { ...v4Service };
        config.template = { type: TemplateType.ListReportObjectPage, settings: v4TemplateSettings };

        await generate('/test/opaVersionTest_noui5', config);

        // setAppDefaults coerces undefined version to '' — empty string routes to the 1.150 bucket
        expect(mockGenerateOPAFiles).toHaveBeenCalledWith(
            '/test/opaVersionTest_noui5',
            expect.objectContaining({ ui5Version: '' }),
            expect.anything(),
            expect.anything(),
            undefined
        );
    });

    it('does not call generateOPAFiles when addTests is false', async () => {
        const config = applyBaseConfigToFEApp('opaVersionTest_noTests', TemplateType.ListReportObjectPage);
        config.ui5 = { ...config.ui5, version: '1.120.0' };
        config.appOptions = { ...config.appOptions, addTests: false };
        config.service = { ...v4Service };
        config.template = { type: TemplateType.ListReportObjectPage, settings: v4TemplateSettings };

        await generate('/test/opaVersionTest_noTests', config);

        expect(mockGenerateOPAFiles).not.toHaveBeenCalled();
    });
});
