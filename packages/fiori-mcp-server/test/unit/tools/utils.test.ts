import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import { resolveApplication, resolveRefs } from '../../../src/tools/utils';
import { join } from 'path';
import listReportSchema from '../page-editor-api/test-data/schema/ListReport.json';
import type { JSONSchema4 } from 'json-schema';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
    test('Empty schema', async () => {
        expect(resolveRefs({}, listReportSchema as JSONSchema4)).toEqual({});
    });

    test('No schema', async () => {
        expect(resolveRefs(null, listReportSchema as JSONSchema4)).toEqual({});
    });

    test('Wrong format', async () => {
        expect(resolveRefs('{}' as unknown as JSONSchema4, listReportSchema as JSONSchema4)).toEqual({});
    });

    test('Schema without ref', async () => {
        const schemaSegment: JSONSchema4 = {
            description: 'Test 1',
            type: 'string'
        };
        const result = resolveRefs(schemaSegment, listReportSchema as JSONSchema4);
        expect(result).toEqual(schemaSegment);
    });

    test('Schema with properties and without ref', async () => {
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

    test('$ref on root level', async () => {
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

    test('Avoid recursion', async () => {
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

    test('Handle "items" as object', async () => {
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

    test('Handle "items" as array', async () => {
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

    test('Handle "additionalProperties" as object', async () => {
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
    test.each(variationsUnions)('Handle "%s" as array', async (variation: string) => {
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
