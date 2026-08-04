import { jest } from '@jest/globals';

const mockReadFileSync = jest.fn<(path: string, encoding: string) => string>();
const mockWriteFileSync = jest.fn<(path: string, data: string) => void>();

jest.unstable_mockModule('node:fs', () => ({
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync
}));

const mockRender = jest.fn<(template: string, data: Record<string, unknown>) => string>();

jest.unstable_mockModule('ejs', () => ({
    render: mockRender
}));

const mockGetTemplatePath = jest.fn<(name: string) => string>();

jest.unstable_mockModule('../../src/utils.js', () => ({
    getTemplatePath: mockGetTemplatePath
}));

const { renderTemplateToDisk } = await import('../../src/mta-config/template-renderer.js');

describe('renderTemplateToDisk', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('resolves template path, renders, and writes to disk', () => {
        const templateName = 'app/mta.yaml';
        const outputPath = '/project/mta.yaml';
        const data = { id: 'my-mta', mtaVersion: '0.0.1' };
        const resolvedTemplatePath = '/dist/templates/app/mta.yaml';
        const rawTemplate = '<%= id %>';
        const rendered = 'my-mta';

        mockGetTemplatePath.mockReturnValue(resolvedTemplatePath);
        mockReadFileSync.mockReturnValue(rawTemplate);
        mockRender.mockReturnValue(rendered);

        renderTemplateToDisk(templateName, outputPath, data);

        expect(mockGetTemplatePath).toHaveBeenCalledWith(templateName);
        expect(mockReadFileSync).toHaveBeenCalledWith(resolvedTemplatePath, 'utf-8');
        expect(mockRender).toHaveBeenCalledWith(rawTemplate, data);
        expect(mockWriteFileSync).toHaveBeenCalledWith(outputPath, rendered);
    });

    test('passes all data properties to the template renderer', () => {
        const data = { id: 'mta-id', mtaDescription: 'desc', mtaVersion: '1.0.0' };
        mockGetTemplatePath.mockReturnValue('/tmpl');
        mockReadFileSync.mockReturnValue('tmpl');
        mockRender.mockReturnValue('rendered');

        renderTemplateToDisk('some/template.yaml', '/out.yaml', data);

        expect(mockRender).toHaveBeenCalledWith('tmpl', data);
    });

    test('uses output path directly for writeFileSync', () => {
        const outputPath = '/nested/deep/output.yaml';
        mockGetTemplatePath.mockReturnValue('/tmpl');
        mockReadFileSync.mockReturnValue('t');
        mockRender.mockReturnValue('out');

        renderTemplateToDisk('t', outputPath, {});

        expect(mockWriteFileSync).toHaveBeenCalledWith(outputPath, 'out');
    });

    test('throws if readFileSync fails', () => {
        mockGetTemplatePath.mockReturnValue('/tmpl');
        mockReadFileSync.mockImplementation(() => {
            throw new Error('ENOENT');
        });

        expect(() => renderTemplateToDisk('t', '/out', {})).toThrow('ENOENT');
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
});
