import { jest } from '@jest/globals';

const mockCreateService = jest.fn<any>();
const mockGetServiceName = jest.fn<any>().mockResolvedValue('mainService');

jest.unstable_mockModule('@sap-ux/fiori-annotation-api', () => ({
    FioriAnnotationService: { createService: mockCreateService },
    ChangeType: { InsertAnnotation: 'insert-annotation' }
}));

jest.unstable_mockModule('../../../src/page-editor-api/index.js', () => ({
    getServiceName: mockGetServiceName
}));

const { writeAnnotationShells, ANNOTATION_SHELL_TERMS } =
    await import('../../../src/tools/building-block-annotations.js');

const applicationAccess = { project: { root: '/app', projectType: 'EDMXBackend' } } as any;
const fs = {} as any;

/** Builds a fake FioriAnnotationService whose schema/files the tests control. */
function fakeService(options: {
    entitySets?: Array<{ name: string; entityTypeName?: string; fullyQualifiedName?: string }>;
    annotations?: Record<string, unknown>;
    writable?: boolean;
    edit?: jest.Mock;
    save?: jest.Mock;
}) {
    const files = options.writable === false ? [] : [{ uri: 'file:///ann.xml', isReadOnly: false }];
    return {
        sync: jest.fn<any>().mockResolvedValue(undefined),
        getAllFiles: () => files,
        getSchema: () => ({ schema: { entitySets: options.entitySets ?? [], annotations: options.annotations ?? {} } }),
        edit: options.edit ?? jest.fn(),
        save: options.save ?? jest.fn<any>().mockResolvedValue(undefined)
    };
}

describe('ANNOTATION_SHELL_TERMS', () => {
    test('maps only Table, FilterBar and Form to their UI terms', () => {
        expect(ANNOTATION_SHELL_TERMS['table']).toBe('com.sap.vocabularies.UI.v1.LineItem');
        expect(ANNOTATION_SHELL_TERMS['filter-bar']).toBe('com.sap.vocabularies.UI.v1.SelectionFields');
        expect(ANNOTATION_SHELL_TERMS['form']).toBe('com.sap.vocabularies.UI.v1.FieldGroup');
        expect(ANNOTATION_SHELL_TERMS['chart']).toBeUndefined();
        expect(ANNOTATION_SHELL_TERMS['action']).toBeUndefined();
    });
});

describe('writeAnnotationShells', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetServiceName.mockResolvedValue('mainService');
    });

    test('skips (no term) for a building block type without an annotation shell', async () => {
        const result = await writeAnnotationShells({ buildingBlockType: 'chart' }, applicationAccess, 'app', fs);

        expect(result).toEqual({ written: 0 });
        expect(mockCreateService).not.toHaveBeenCalled();
    });

    test('skips when no entity set can be derived', async () => {
        const result = await writeAnnotationShells(
            { buildingBlockType: 'table', metaPath: '@com.sap.vocabularies.UI.v1.LineItem' },
            applicationAccess,
            'app',
            fs
        );

        expect(result).toEqual({ written: 0 });
        expect(mockCreateService).not.toHaveBeenCalled();
    });

    test('writes a LineItem shell for a Table using contextPath', async () => {
        const edit = jest.fn();
        mockCreateService.mockResolvedValue(
            fakeService({ entitySets: [{ name: 'SalesOrder', entityTypeName: 'ns.SalesOrder' }], edit })
        );

        const result = await writeAnnotationShells(
            { buildingBlockType: 'table', contextPath: '/SalesOrder' },
            applicationAccess,
            'app',
            fs
        );

        expect(result).toEqual({ written: 1 });
        expect(edit).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'insert-annotation',
                content: expect.objectContaining({
                    target: 'ns.SalesOrder',
                    value: expect.objectContaining({ term: 'com.sap.vocabularies.UI.v1.LineItem', collection: [] })
                })
            })
        );
    });

    test('builds a record wrapper for a Form FieldGroup shell', async () => {
        const edit = jest.fn();
        mockCreateService.mockResolvedValue(
            fakeService({ entitySets: [{ name: 'SalesOrder', entityTypeName: 'ns.SalesOrder' }], edit })
        );

        await writeAnnotationShells(
            { buildingBlockType: 'form', metaPath: 'SalesOrder/@com.sap.vocabularies.UI.v1.FieldGroup' },
            applicationAccess,
            'app',
            fs
        );

        const value = edit.mock.calls[0][0].content.value;
        expect(value.term).toBe('com.sap.vocabularies.UI.v1.FieldGroup');
        expect(value.record).toEqual({
            type: 'com.sap.vocabularies.UI.v1.FieldGroupType',
            propertyValues: [{ name: 'Data', value: { type: 'Collection', Collection: [] } }]
        });
    });

    test('does not write a duplicate shell when the annotation already exists', async () => {
        const edit = jest.fn();
        mockCreateService.mockResolvedValue(
            fakeService({
                entitySets: [{ name: 'SalesOrder', entityTypeName: 'ns.SalesOrder' }],
                annotations: {
                    'file:///ann.xml': [
                        {
                            target: 'ns.SalesOrder',
                            annotations: [{ term: 'com.sap.vocabularies.UI.v1.LineItem', qualifier: '' }]
                        }
                    ]
                },
                edit
            })
        );

        const result = await writeAnnotationShells(
            { buildingBlockType: 'table', contextPath: '/SalesOrder' },
            applicationAccess,
            'app',
            fs
        );

        expect(result).toEqual({ written: 0 });
        expect(edit).not.toHaveBeenCalled();
    });

    test('skips when no writable annotation file is available', async () => {
        mockCreateService.mockResolvedValue(
            fakeService({ entitySets: [{ name: 'SalesOrder', entityTypeName: 'ns.SalesOrder' }], writable: false })
        );

        const result = await writeAnnotationShells(
            { buildingBlockType: 'table', contextPath: '/SalesOrder' },
            applicationAccess,
            'app',
            fs
        );

        expect(result).toEqual({ written: 0 });
    });

    test('reports a non-fatal failure when the annotation service throws', async () => {
        mockCreateService.mockRejectedValue(new Error('service boom'));

        const result = await writeAnnotationShells(
            { buildingBlockType: 'table', contextPath: '/SalesOrder' },
            applicationAccess,
            'app',
            fs
        );

        expect(result).toEqual({ written: 0, failed: true });
    });
});
