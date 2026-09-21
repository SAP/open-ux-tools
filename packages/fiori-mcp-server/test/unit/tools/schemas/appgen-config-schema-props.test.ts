import { generatorConfigOData } from '../../../../src/tools/schemas/generate-fiori-app-odata.js';

const baseOData = {
    floorplan: 'FE_LROP' as const,
    project: { name: 'my-app', description: 'Test', targetFolder: '/tmp' },
    service: { host: 'https://host.example', servicePath: '/sap/opu/odata/sap/SRV/' }
};

describe('generatorConfigOData — project.enableTypeScript', () => {
    test('defaults to false when omitted', () => {
        const parsed = generatorConfigOData.parse(baseOData);
        expect(parsed.project.enableTypeScript).toBe(false);
    });

    test('passes through true when provided', () => {
        const parsed = generatorConfigOData.parse({
            ...baseOData,
            project: { ...baseOData.project, enableTypeScript: true }
        });
        expect(parsed.project.enableTypeScript).toBe(true);
    });
});

describe('generatorConfigOData — project.namespace', () => {
    test('accepts a valid dot-separated lowercase namespace', () => {
        const parsed = generatorConfigOData.parse({
            ...baseOData,
            project: { ...baseOData.project, namespace: 'com.mycompany' }
        });
        expect(parsed.project.namespace).toBe('com.mycompany');
    });

    test('accepts namespace with underscores', () => {
        const parsed = generatorConfigOData.parse({
            ...baseOData,
            project: { ...baseOData.project, namespace: 'com.my_company' }
        });
        expect(parsed.project.namespace).toBe('com.my_company');
    });

    test('is optional — omitting it leaves it undefined', () => {
        const parsed = generatorConfigOData.parse(baseOData);
        expect(parsed.project.namespace).toBeUndefined();
    });

    test.each([
        ['starts with a digit', '1bad'],
        ['contains a slash', 'com/bad'],
        ['contains spaces', 'com bad'],
        ['trailing dot', 'com.bad.'],
        ['digit after dot', 'com.1bad'],
        ['uppercase letter', 'Com.bad']
    ])('rejects namespace that %s: "%s"', (_label, ns) => {
        expect(() =>
            generatorConfigOData.parse({
                ...baseOData,
                project: { ...baseOData.project, namespace: ns }
            })
        ).toThrow();
    });
});

describe('generatorConfigOData — project.viewName cross-field validation', () => {
    test('accepts viewName for FF_SIMPLE floorplan', () => {
        const parsed = generatorConfigOData.parse({
            floorplan: 'FF_SIMPLE',
            project: { name: 'my-app', description: 'Test', targetFolder: '/tmp', viewName: 'Main' }
        });
        expect(parsed.project.viewName).toBe('Main');
    });

    test('rejects viewName when floorplan is not FF_SIMPLE', () => {
        expect(() =>
            generatorConfigOData.parse({
                ...baseOData,
                project: { ...baseOData.project, viewName: 'Main' }
            })
        ).toThrow('project.viewName is only supported for the FF_SIMPLE');
    });

    test('is optional — omitting it for FF_SIMPLE is allowed', () => {
        const parsed = generatorConfigOData.parse({
            floorplan: 'FF_SIMPLE',
            project: { name: 'my-app', description: 'Test', targetFolder: '/tmp' }
        });
        expect(parsed.project.viewName).toBeUndefined();
    });
});
