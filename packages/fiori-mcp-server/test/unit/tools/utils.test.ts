import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import {
    convertToSchema,
    prepatePropertySchema,
    resolveApplication,
    resolveRefs,
    validateWithSchema
} from '../../../src/tools/utils';
import { join } from 'node:path';
import listReportSchema from '../page-editor-api/test-data/schema/ListReport.json';
import * as zod from 'zod';
import type { JSONSchema4 } from 'json-schema';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,

    ...(jest.requireActual('@sap-ux/project-access') as object)
}));

describe('resolveApplication', () => {
    const appPath = join('folder', 'dummy', 'app');
    const findProjectRootSpy: jest.SpyInstance = jest.spyOn(openUxProjectAccessDependency, 'findProjectRoot');
    const createApplicationAccessSpy: jest.SpyInstance = jest.spyOn(
        openUxProjectAccessDependency,
        'createApplicationAccess'
    );
    const getProjectSpy: jest.SpyInstance = jest.spyOn(openUxProjectAccessDependency, 'getProject');
    const mockCreateApplicationAccess = (appIds: string[] = [''], appId = '') => {
        createApplicationAccessSpy.mockImplementation((root: string) => {
            const apps: { [key: string]: {} } = {};
            for (const appId of appIds) {
                apps[appId] = {};
            }
            if (appId) {
                root = root.slice(0, root.length - appId.length - 1);
            }
            return {
                getAppId: () => appId,
                project: {
                    root: root,
                    apps
                }
            };
        });
        getProjectSpy.mockResolvedValue({
            root: appPath,
            apps: {},
            projectType: 'CAPNodejs'
        });
    };
    beforeEach(async () => {
        findProjectRootSpy.mockImplementation(async (path: string): Promise<string> => path);
        mockCreateApplicationAccess([''], '');
    });

    test('Root and app paths are matching', async () => {
        const application = await resolveApplication(appPath);
        expect(application?.appId).toEqual('');
        expect(application?.root).toEqual(appPath);
    });

    test('Root and app paths are different', async () => {
        mockCreateApplicationAccess([join('dummy', 'app'), join('dummy', 'app2')], join('dummy', 'app'));
        findProjectRootSpy.mockResolvedValue('folder');
        const application = await resolveApplication(appPath);
        expect(application?.appId).toEqual(join('dummy', 'app'));
        expect(application?.root).toEqual('folder');
    });

    test('No any app', async () => {
        mockCreateApplicationAccess([]);
        const application = await resolveApplication(appPath);
        expect(application?.appId).toEqual('');
        expect(application?.root).toEqual(appPath);
    });

    test('No app found, but root exists', async () => {
        createApplicationAccessSpy.mockImplementation(() => {
            throw new Error('Dummy');
        });
        findProjectRootSpy.mockResolvedValue(appPath);

        const application = await resolveApplication(appPath);
        expect(application?.root).toEqual(appPath);
        expect(application?.applicationAccess).toEqual(undefined);
    });

    test('Error thrown while searching application', async () => {
        createApplicationAccessSpy.mockImplementation(() => {
            throw new Error('Dummy');
        });
        const application = await resolveApplication(appPath);
        expect(application?.appId).toEqual('');
        expect(application?.root).toEqual(appPath);
    });

    test('Error thrown while getting app and project', async () => {
        getProjectSpy.mockImplementation(() => {
            throw new Error('Dummy');
        });
        createApplicationAccessSpy.mockImplementation(() => {
            throw new Error('Dummy');
        });
        const application = await resolveApplication(appPath);
        expect(application).toEqual(undefined);
    });
});

describe('resolveRefs', () => {
    test('Empty schema', () => {
        expect(resolveRefs({}, listReportSchema as JSONSchema4)).toEqual({});
    });

    test('No schema', () => {
        expect(resolveRefs(null, listReportSchema as JSONSchema4)).toEqual({});
    });

    test('Wrong format', () => {
        expect(resolveRefs('{}' as unknown as JSONSchema4, listReportSchema as JSONSchema4)).toEqual({});
    });

    test('Schema without ref', () => {
        const schemaSegment: JSONSchema4 = {
            description: 'Test 1',
            type: 'string'
        };
        const result = resolveRefs(schemaSegment, listReportSchema as JSONSchema4);
        expect(result).toEqual(schemaSegment);
    });

    test('Schema with properties and without ref', () => {
        const schemaSegment: JSONSchema4 = {
            type: 'object',
            description: 'Dummy',
            properties: {
                test: {
                    description: 'Test 1',
                    type: 'string'
                },
                test2: {
                    description: 'Test 2',
                    type: 'string'
                }
            }
        };
        const result = resolveRefs(schemaSegment, listReportSchema as JSONSchema4);
        expect(result).toEqual(schemaSegment);
    });

    test('$ref on root level', () => {
        const schemaSegment: JSONSchema4 = {
            '$ref': '#/definitions/ActionPlacement',
            'description': 'Define the placement.'
        };
        const result = resolveRefs(schemaSegment, listReportSchema as JSONSchema4);
        expect(result).toEqual({
            description: 'Define the placement.',
            enum: ['After', 'Before'],
            type: 'string'
        });
    });

    test('Avoid recursion', () => {
        const schemaSegment: JSONSchema4 = {
            '$ref': '#/definitions/ActionPlacement'
        };
        const result = resolveRefs(schemaSegment, {
            ...listReportSchema,
            definitions: {
                ActionPlacement: {
                    '$ref': '#/definitions/ActionPlacement',
                    'description': 'Define the placement.'
                }
            }
        } as JSONSchema4);
        expect(result).toEqual({
            'description': 'Define the placement.',
            '$ref': '#/definitions/ActionPlacement'
        });
    });

    test('Handle "items" as object', () => {
        const schemaSegment: JSONSchema4 = {
            type: 'object',
            properties: {
                paths: {
                    description: 'Dummy description',
                    type: 'array',
                    items: {
                        '$ref': '#/definitions/AnnotationPathAsObject'
                    }
                }
            }
        };
        const result = resolveRefs(schemaSegment, listReportSchema as JSONSchema4);
        expect(result).toEqual({
            'properties': {
                'paths': {
                    'description': 'Dummy description',
                    'items': {
                        'additionalProperties': false,
                        'properties': {
                            'annotationPath': {
                                'type': 'string'
                            }
                        },
                        'required': ['annotationPath'],
                        'type': 'object'
                    },
                    'type': 'array'
                }
            },
            'type': 'object'
        });
    });

    test('Handle "items" as array', () => {
        const schemaSegment: JSONSchema4 = {
            type: 'object',
            properties: {
                paths: {
                    description: 'Dummy description',
                    type: 'array',
                    items: [
                        {
                            '$ref': '#/definitions/AnnotationPathAsObject'
                        },
                        {
                            '$ref': '#/definitions/SelectionMode'
                        }
                    ]
                }
            }
        };
        const result = resolveRefs(schemaSegment, listReportSchema as JSONSchema4);
        expect(result).toEqual({
            'properties': {
                'paths': {
                    'description': 'Dummy description',
                    'items': [
                        {
                            'additionalProperties': false,
                            'properties': {
                                'annotationPath': {
                                    'type': 'string'
                                }
                            },
                            'required': ['annotationPath'],
                            'type': 'object'
                        },
                        {
                            'enum': ['Auto', 'Multi', 'None', 'Single'],
                            'type': 'string'
                        }
                    ],
                    'type': 'array'
                }
            },
            'type': 'object'
        });
    });

    test('Handle "additionalProperties" as object', () => {
        const schemaSegment: JSONSchema4 = {
            'type': 'object',
            'additionalProperties': {
                '$ref': '#/definitions/AnnotationPathAsObject'
            }
        };
        const result = resolveRefs(schemaSegment, listReportSchema as JSONSchema4);
        expect(result).toEqual({
            'additionalProperties': {
                'additionalProperties': false,
                'properties': {
                    'annotationPath': {
                        'type': 'string'
                    }
                },
                'required': ['annotationPath'],
                'type': 'object'
            },
            'type': 'object'
        });
    });

    const variationsUnions = ['anyOf', 'oneOf', 'allOf'];
    test.each(variationsUnions)('Handle "%s" as array', (variation: string) => {
        const schemaSegment: JSONSchema4 = {
            [variation]: [
                {
                    '$ref': '#/definitions/AnnotationPathAsObject'
                },
                {
                    '$ref': '#/definitions/SelectionMode'
                }
            ]
        };
        const result = resolveRefs(schemaSegment, listReportSchema as JSONSchema4);
        expect(result).toEqual({
            [variation]: [
                {
                    'additionalProperties': false,
                    'properties': {
                        'annotationPath': {
                            'type': 'string'
                        }
                    },
                    'required': ['annotationPath'],
                    'type': 'object'
                },
                {
                    'enum': ['Auto', 'Multi', 'None', 'Single'],
                    'type': 'string'
                }
            ]
        });
    });
});

describe('convertToSchema', () => {
    test('Convert zod schema to json schema', () => {
        expect(
            convertToSchema(
                zod.object({
                    name: zod.string().describe('Name of something'),
                    visible: zod.boolean().describe('Visibility of something')
                })
            )
        ).toEqual({
            'additionalProperties': false,
            'properties': {
                'name': {
                    'description': 'Name of something',
                    'type': 'string'
                },
                'visible': {
                    'description': 'Visibility of something',
                    'type': 'boolean'
                }
            },
            'required': ['name', 'visible'],
            'type': 'object'
        });
    });
});

describe('validateWithSchema', () => {
    const schema = zod.object({
        name: zod.string().describe('Name of something'),
        visible: zod.boolean().describe('Visibility of something')
    });
    test('Valid data', () => {
        expect(validateWithSchema(schema, { name: 'dummy', visible: true })).toEqual({ name: 'dummy', visible: true });
    });

    test('Invalid data', () => {
        expect(() => validateWithSchema(schema, { name: 'dummy' })).toThrowErrorMatchingInlineSnapshot(`
            "Missing required fields in parameters. [
                {
                    \\"expected\\": \\"boolean\\",
                    \\"code\\": \\"invalid_type\\",
                    \\"path\\": [
                        \\"visible\\"
                    ],
                    \\"message\\": \\"Invalid input: expected boolean, received undefined\\"
                }
            ]"
        `);
    });

    test('Unknown error', () => {
        const tempSchema = zod.object({});
        jest.spyOn(tempSchema, 'parse').mockImplementation(() => {
            throw new Error('Dummy');
        });
        expect(() => validateWithSchema(tempSchema, { name: 'dummy' })).toThrowErrorMatchingInlineSnapshot(
            `"Unknown error. Recheck input parameters."`
        );
    });
});

describe('prepatePropertySchema', () => {
    test('simple property', () => {
        expect(
            prepatePropertySchema('dummy', {
                type: 'string'
            })
        ).toEqual({
            type: 'object',
            properties: {
                dummy: {
                    type: 'string'
                }
            }
        });
    });

    test('Object based property', () => {
        expect(
            prepatePropertySchema('dummy', {
                type: 'object',
                properties: {
                    'childProperty': {
                        type: 'string'
                    }
                }
            })
        ).toEqual({
            type: 'object',
            properties: {
                dummy: {
                    type: 'object',
                    properties: {
                        childProperty: {
                            type: 'string'
                        }
                    }
                }
            }
        });
    });
});
