import { join } from 'node:path';
import * as nodeFs from 'node:fs';
import * as ejs from 'ejs';
import * as utils from '../../src/utils';
import { renderTemplateToDisk } from '../../src/mta-config/template-renderer';

jest.mock('node:fs', () => ({
    readFileSync: jest.fn(),
    writeFileSync: jest.fn()
}));

jest.mock('ejs', () => ({
    render: jest.fn()
}));

jest.mock('../../src/utils', () => ({
    getTemplatePath: jest.fn()
}));

describe('renderTemplateToDisk', () => {
    const getTemplatePathMock = utils.getTemplatePath as jest.MockedFunction<typeof utils.getTemplatePath>;
    const readFileSyncMock = nodeFs.readFileSync as jest.MockedFunction<typeof nodeFs.readFileSync>;
    const writeFileSyncMock = nodeFs.writeFileSync as jest.MockedFunction<typeof nodeFs.writeFileSync>;
    const renderMock = ejs.render as jest.MockedFunction<typeof ejs.render>;

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

        getTemplatePathMock.mockReturnValue(resolvedTemplatePath);
        readFileSyncMock.mockReturnValue(rawTemplate as any);
        renderMock.mockReturnValue(rendered);

        renderTemplateToDisk(templateName, outputPath, data);

        expect(getTemplatePathMock).toHaveBeenCalledWith(templateName);
        expect(readFileSyncMock).toHaveBeenCalledWith(resolvedTemplatePath, 'utf-8');
        expect(renderMock).toHaveBeenCalledWith(rawTemplate, data);
        expect(writeFileSyncMock).toHaveBeenCalledWith(outputPath, rendered);
    });

    test('passes all data properties to the template renderer', () => {
        const data = { id: 'mta-id', mtaDescription: 'desc', mtaVersion: '1.0.0' };
        getTemplatePathMock.mockReturnValue('/tmpl');
        readFileSyncMock.mockReturnValue('tmpl' as any);
        renderMock.mockReturnValue('rendered');

        renderTemplateToDisk('some/template.yaml', '/out.yaml', data);

        expect(renderMock).toHaveBeenCalledWith('tmpl', data);
    });

    test('uses output path directly for writeFileSync', () => {
        const outputPath = join('/nested', 'deep', 'output.yaml');
        getTemplatePathMock.mockReturnValue('/tmpl');
        readFileSyncMock.mockReturnValue('t' as any);
        renderMock.mockReturnValue('out');

        renderTemplateToDisk('t', outputPath, {});

        expect(writeFileSyncMock).toHaveBeenCalledWith(outputPath, 'out');
    });
});
