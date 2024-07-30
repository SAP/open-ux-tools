import { fileURLToPath, pathToFileURL } from 'url';
import { promises } from 'fs';
import { join, relative, sep, posix } from 'path';
import { create as createStore } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create as createEditor } from 'mem-fs-editor';

import type { Project } from '@sap-ux/project-access';

import type { AnnotationRecord, Collection, PropertyPathExpression, RawAnnotation } from '@sap-ux/vocabularies-types';
import { getProject } from '@sap-ux/project-access';

import type { Change, DeleteChange, InsertAnnotationChange, TextFile } from '../../src/types';
import { ExpressionType, ChangeType } from '../../src/types';
import { FioriAnnotationService } from '../../src/fiori-service';

import { createFsEditorForProject } from './virtual-fs';
import type { ProjectTestModel } from './projects';
import { PROJECTS } from './projects';
import { getLocalEDMXService } from '../../src/xml';
import { serialize } from './raw-metadata-serializer';

import { CDSAnnotationServiceAdapter } from '../../src/cds/adapter';
import type { CompilerMessage } from '@sap-ux/odata-annotation-core-types';
import { DiagnosticSeverity, Range } from '@sap-ux/odata-annotation-core-types';
import type { ApiError } from '../../src';

import { pathFromUri } from '../../src/utils';

/**
 * Configuration
 */

jest.mock('../../src/cds/adapter', () => {
    const act = jest.requireActual('../../src/cds/adapter');
    return {
        __esModule: true,
        ...act
    };
});

const SKIP_TARGETS = new Set<ProjectTestModel<Record<string, string>>>([
    // PROJECTS.V4_XML_START
    // PROJECTS.V4_CDS_START
]);
const TEST_TARGETS = [PROJECTS.V4_XML_START, PROJECTS.V4_CDS_START];

const targetName = 'IncidentService.test';
const TARGET_INCIDENTS = 'IncidentService.Incidents';

const EMPTY_EDMX_FILE = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:Reference Uri="/incident/$metadata">
        <edmx:Include Namespace="IncidentService" Alias="Service" />
    </edmx:Reference>
    <edmx:DataServices>
        <Schema Namespace="Annotations" xmlns="http://docs.oasis-open.org/odata/ns/edm">
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

const COMMUNICATION = 'com.sap.vocabularies.Communication.v1';
const CONTACT = `${COMMUNICATION}.Contact`;
const PHONE_NUMBER_TYPE = `${COMMUNICATION}.PhoneNumberType`;
const PHONE_TYPE_WORK = `${COMMUNICATION}.PhoneType/work`;
const PHONE_TYPE_PREFERRED = `${COMMUNICATION}.PhoneType/preferred`;
const PHONE_TYPE_CELL = `${COMMUNICATION}.PhoneType/cell`;

const UI = 'com.sap.vocabularies.UI.v1';
const COMMON = 'com.sap.vocabularies.Common.v1';
const LINE_ITEM = `${UI}.LineItem`;
const SELECTION_FIELDS = `${UI}.SelectionFields`;
const CHART = `${UI}.Chart`;
const CHART_TYPE_BAR = `${UI}.ChartType/Bar`;
const CHART_TYPE_COLUMN = `${UI}.ChartType/Column`;
const CHART_DEFINITION_TYPE = `${UI}.ChartDefinitionType`;
const CRITICALITY = `${UI}.Criticality`;
const DATA_FIELD_TYPE = `${UI}.DataField`;
const FIELD_GROUP = `${UI}.FieldGroup`;
const DATA_POINT = `${UI}.DataPoint`;
const VALUE_LIST = `${COMMON}.ValueList`;
const VALUE_LIST_WITH_FIXED_VALUE = `${COMMON}.ValueListWithFixedValues`;
interface EditTestCase<T extends Record<string, string>> {
    name: string;
    projectTestModels: ProjectTestModel<T>[];
    getInitialChanges?: (files: T) => Change[];
    getChanges: (files: T) => Change[];
    fsEditor?: Editor;
    log?: boolean;
}

interface CustomTest<T extends Record<string, string>> {
    (testCase: EditTestCase<T>, timeout?: number): void;
    only: CustomTest<T>;
    skip: CustomTest<T>;
}

const createEditTestCase = (<T extends Record<string, string>>(): CustomTest<T> => {
    const run = (testCase: EditTestCase<T>, timeout?: number) => () => {
        for (const model of testCase.projectTestModels) {
            const { info, root, files, serviceName } = model;
            const name = `${info.type} ${info.name} ${info.version}`;
            if (SKIP_TARGETS.has(model)) {
                test.skip(name, () => {});
            } else {
                test(
                    name,
                    async () => {
                        const text = await testEdit(
                            root,
                            testCase.getInitialChanges ? testCase.getInitialChanges(files) : [],
                            testCase.getChanges(files),
                            serviceName,
                            testCase.fsEditor,
                            testCase.log
                        );

                        expect(text).toMatchSnapshot();
                    },
                    timeout
                );
            }
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runner: any = (testCase: EditTestCase<T>, timeout?: number): void => {
        describe(testCase.name, run(testCase, timeout));
    };
    runner.only = (testCase: EditTestCase<T>, timeout?: number): void => {
        describe.only(testCase.name, run(testCase, timeout));
    };
    runner.skip = (testCase: EditTestCase<T>, timeout?: number): void => {
        describe.skip(testCase.name, run(testCase, timeout));
    };
    return runner;
})();

async function testEdit(
    root: string,
    initialChanges: Change[],
    changes: Change[],
    serviceName: string,
    fsEditor?: Editor,
    log?: boolean
): Promise<string> {
    const editor = fsEditor ?? (await createFsEditorForProject(root));
    const project = await getProject(root);
    const service = await FioriAnnotationService.createService(project, serviceName, '', editor, {
        commitOnSave: false
    });
    await service.sync();
    const initialChangeCache = new Map<string, string>();
    if (initialChanges.length > 0) {
        const initialChangeFileUris = applyChanges(service, initialChanges);
        await service.save({ resyncAfterSave: true });
        if (log) {
            for (const uri of initialChangeFileUris.values()) {
                const path = fileURLToPath(uri);
                const data = editor.read(path);
                initialChangeCache.set(uri, data);
            }
        }
    }

    const changedFileUris = applyChanges(service, changes);
    await service.save();

    for (const uri of changedFileUris.values()) {
        const path = pathFromUri(uri);
        const original = await promises.readFile(path, { encoding: 'utf-8' });
        const afterInitialChanges = initialChangeCache.get(uri);
        const textAfterEdit = editor.read(path);
        if (log) {
            console.log('Original: \n', original);
            if (afterInitialChanges !== undefined) {
                console.log('After initial changes: \n', afterInitialChanges);
            }
            console.log('After test changes: \n', textAfterEdit);
        }
        return textAfterEdit ?? '';
    }
    return '';
}

function applyChanges(service: FioriAnnotationService, changes: Change[]): Set<string> {
    const uris = new Set<string>();
    for (const change of changes) {
        service.edit(change);
        uris.add(change.uri);
    }
    return uris;
}

async function testRead(
    root: string,
    initialChanges: Change[],
    serviceName = 'mainService',
    fsEditor?: Editor
): Promise<FioriAnnotationService> {
    const editor = fsEditor ?? (await createFsEditorForProject(root));
    const project = await getProject(root);
    const service = await FioriAnnotationService.createService(project, serviceName, '', editor, {
        commitOnSave: false
    });
    await service.sync();
    if (initialChanges.length > 0) {
        service.edit(initialChanges);
        await service.save({ resyncAfterSave: true });
    }
    return service;
}

async function testEditWithMockData(
    project: Project,
    changes: Change[],
    fsEditor?: Editor,
    log = false
): Promise<string> {
    const editor = fsEditor ?? (await createFsEditorForProject(project.root));
    const service = await FioriAnnotationService.createService(project, 'mainService', '', editor, {
        commitOnSave: false
    });
    await service.sync();
    const uris = new Set<string>();
    for (const change of changes) {
        service.edit(change);
        uris.add(change.uri);
    }
    await service.save();

    for (const uri of uris.values()) {
        const path = pathFromUri(uri);
        const textAfterEdit = editor?.read(path);
        if (log) {
            console.log(textAfterEdit);
        }
        return textAfterEdit ?? '';
    }
    return '';
}

function createVolume(root: string): Editor {
    const metadataFilePath = pathFromUri(
        pathToFileURL(join(root, 'webapp', 'localService', 'metadata.xml')).toString()
    );
    const annotationFilePath = pathFromUri(
        pathToFileURL(join(root, 'webapp', 'annotations', 'annotation.xml')).toString()
    );
    const editor = createEditor(createStore());
    editor.write(metadataFilePath, EMPTY_EDMX_FILE);
    editor.write(annotationFilePath, EMPTY_EDMX_FILE);
    return editor;
}

function createLineItem(
    uri: string,
    collection: AnnotationRecord[],
    qualifier?: string,
    target = targetName
): InsertAnnotationChange {
    return {
        kind: ChangeType.InsertAnnotation,
        uri,
        content: {
            type: 'annotation',
            target,
            value: {
                term: LINE_ITEM,
                qualifier,
                collection
            }
        }
    };
}

function createSelectionFields(
    uri: string,
    collection: PropertyPathExpression[],
    qualifier?: string
): InsertAnnotationChange {
    return {
        kind: ChangeType.InsertAnnotation,
        uri,
        content: {
            type: 'annotation',
            target: targetName,
            value: {
                term: SELECTION_FIELDS,
                qualifier,
                collection
            }
        }
    };
}

function createLineItemWithAnnotations(
    uri: string,
    collection: AnnotationRecord[],
    annotations: RawAnnotation[],
    qualifier?: string
): InsertAnnotationChange {
    const change = createLineItem(uri, collection, qualifier);
    change.content.value.annotations = annotations;
    return change;
}

function createDataField(value = 'path', annotations: RawAnnotation[] = [], type = true): AnnotationRecord {
    const record: AnnotationRecord = {
        propertyValues: [
            {
                name: 'Value',
                value: {
                    type: 'PropertyPath',
                    PropertyPath: value
                }
            }
        ],
        annotations
    };
    if (type) {
        record.type = DATA_FIELD_TYPE;
    }
    return record;
}
function createDataWithLabel(value = 'sample'): AnnotationRecord {
    return {
        type: DATA_FIELD_TYPE,
        propertyValues: [
            {
                name: 'Label',
                value: {
                    type: 'String',
                    String: value
                }
            }
        ]
    };
}

function createValueListWithRecord(uri: string, targetName: string): InsertAnnotationChange {
    const record: AnnotationRecord = {
        type: `${COMMON}.ValueListType`,
        propertyValues: []
    };
    return {
        kind: ChangeType.InsertAnnotation,
        uri,
        content: {
            type: 'annotation',
            target: targetName,
            value: {
                term: VALUE_LIST,
                record
            }
        }
    };
}

function createCommunicationContact(uri: string, targetName: string, phones: string[]): InsertAnnotationChange {
    return {
        kind: ChangeType.InsertAnnotation,
        uri,
        content: {
            type: 'annotation',
            target: targetName,
            value: {
                term: CONTACT,
                record: {
                    propertyValues: [
                        {
                            name: 'tel',
                            value: {
                                type: 'Collection',
                                Collection: phones.map(
                                    (phone): AnnotationRecord => ({
                                        type: PHONE_NUMBER_TYPE,
                                        propertyValues: [
                                            {
                                                name: 'type',
                                                value: {
                                                    type: 'EnumMember',
                                                    EnumMember: phone
                                                }
                                            }
                                        ]
                                    })
                                )
                            }
                        }
                    ]
                }
            }
        }
    };
}

describe('fiori annotation service', () => {
    describe('compile errors', () => {
        let spy: jest.SpyInstance | undefined;
        beforeAll(() => {
            const actualSync = jest.spyOn(CDSAnnotationServiceAdapter.prototype, 'sync').getMockImplementation();
            spy = jest
                .spyOn(CDSAnnotationServiceAdapter.prototype, 'sync')
                .mockImplementationOnce(actualSync!)
                .mockImplementation(() => {
                    const compilerMessage: CompilerMessage = {
                        hasSyntaxErrors: true,
                        messages: [
                            {
                                message: 'Fake compiler message',
                                range: Range.create(0, 0, 1, 1),
                                severity: DiagnosticSeverity.Error
                            },
                            {
                                message: 'Fake compiler warning',
                                range: Range.create(0, 0, 1, 1),
                                severity: DiagnosticSeverity.Warning
                            }
                        ]
                    };
                    return Promise.resolve(
                        new Map().set('testUri', compilerMessage).set('../otherUri', compilerMessage)
                    );
                });
        });
        afterAll(() => spy?.mockRestore());

        const record: AnnotationRecord = {
            type: 'com.sap.vocabularies.Common.v1.ValueListType',
            propertyValues: [
                {
                    name: 'Parameters',
                    value: {
                        type: 'Collection',
                        Collection: []
                    }
                },
                { name: 'CollectionPath', value: { type: 'String', String: 'Incidents' } },
                { name: 'SearchSupported', value: { type: 'Bool', Bool: true } }
            ]
        };

        test(`throws exception with error messages`, async () => {
            let thrown;
            try {
                const { root, files } = PROJECTS.V4_CDS_START;
                await testEdit(
                    root,
                    [
                        {
                            kind: ChangeType.InsertAnnotation,
                            uri: files.annotations,
                            content: {
                                type: 'annotation',
                                target: 'IncidentService.Incidents/ID',
                                value: {
                                    term: 'com.sap.vocabularies.Common.v1.ValueList',
                                    record
                                }
                            }
                        }
                    ],
                    [
                        {
                            kind: ChangeType.Update,
                            pointer: 'record',
                            reference: {
                                target: 'IncidentService.Incidents/ID',
                                term: 'com.sap.vocabularies.Common.v1.ValueList'
                            },
                            content: {
                                type: 'record',
                                value: record
                            },
                            uri: files.annotations
                        }
                    ],
                    ''
                );
            } catch (e) {
                thrown = e;
            }

            expect((thrown as ApiError).message).toMatchInlineSnapshot(
                `"Update rejected due to changes leading to compile errors"`
            );
            expect((thrown as ApiError).messageMap).toMatchInlineSnapshot(`
                    Map {
                      "testUri" => Array [
                        "Fake compiler message",
                      ],
                    }
                `);
        });
    });

    describe('getAllFiles', () => {
        const toolsRoot = join(__dirname, '..', '..', '..', '..', '..');

        function toRelativePath(projectRoot: string, uri: string): string {
            const projectRootUri = pathToFileURL(projectRoot).toString();
            const toolsRootUri = pathToFileURL(toolsRoot).toString();
            return uri.replace(projectRootUri, 'APP_ROOT').replace(toolsRootUri, 'REPOSITORY_ROOT');
        }

        function convertFilesForSnapshots(projectRoot: string, files: TextFile[]): TextFile[] {
            return files.map((file) => ({ ...file, uri: toRelativePath(projectRoot, file.uri) }));
        }

        test('xml', async () => {
            const service = await testRead(PROJECTS.V4_XML_START.root, []);
            const files = service.getAllFiles();
            expect(convertFilesForSnapshots(PROJECTS.V4_XML_START.root, files)).toMatchSnapshot();
        });
        test('cds', async () => {
            const service = await testRead(PROJECTS.V4_CDS_START.root, [], 'IncidentService');
            const files = service.getAllFiles();
            expect(convertFilesForSnapshots(PROJECTS.V4_CDS_START.root, files)).toMatchSnapshot();
        });
        test('cds with ghost files', async () => {
            const service = await testRead(PROJECTS.V4_CDS_START.root, [], 'IncidentService');
            const files = service.getAllFiles(true);
            expect(convertFilesForSnapshots(PROJECTS.V4_CDS_START.root, files)).toMatchSnapshot();
        });

        test('cds layering', async () => {
            const service = await testRead(PROJECTS.CDS_LAYERING.root, [], 'TravelService');
            const files = service.getAllFiles();
            expect(convertFilesForSnapshots(PROJECTS.CDS_LAYERING.root, files)).toMatchSnapshot();
        });
    });
    describe('initial file content', () => {
        test('xml', async () => {
            const service = await testRead(PROJECTS.V4_XML_START.root, []);
            const newFileContent = service.getInitialFileContent(
                join(PROJECTS.V4_XML_START.root, 'webapp', 'annotations', 'annotations.xml')
            );
            expect(newFileContent).toMatchSnapshot();
        });
        test('cds', async () => {
            const service = await testRead(PROJECTS.V4_CDS_START.root, [], 'IncidentService');
            const newFileContent = service.getInitialFileContent(
                join(PROJECTS.V4_CDS_START.root, 'localService', 'annotations.xml')
            );
            expect(newFileContent).toMatchSnapshot();
        });
    });
    describe('getMetadataService', () => {
        test('returns instance', async () => {
            const service = await testRead(PROJECTS.V4_XML_START.root, []);
            const metadataService = service.getMetadataService();
            expect(metadataService).not.toStrictEqual(undefined);
        });
    });
    describe('read', () => {
        describe('xml', () => {
            test('v4-app', async () => {
                const service = await testRead(PROJECTS.V4_XML_START.root, []);
                const metadata = service.getSchema();
                expect(serialize(metadata.schema, PROJECTS.V4_XML_START.root)).toMatchSnapshot();
            });

            test('v2-app', async () => {
                const service = await testRead(PROJECTS.V2_XML_START.root, []);
                const metadata = service.getSchema();
                expect(serialize(metadata.schema, PROJECTS.V2_XML_START.root)).toMatchSnapshot();
            });

            test('app name does not exist', async () => {
                // by default the app with empty name should be used
                const root = PROJECTS.V4_XML_START.root;
                const project = await getProject(root);
                const result = getLocalEDMXService(project, 'mainService', 'dummyApp');
                expect(
                    relative(PROJECTS.V4_XML_START.root, fileURLToPath(result.metadataFile.uri))
                        .split(sep)
                        .join(posix.sep)
                ).toMatchInlineSnapshot(`"webapp/localService/metadata.xml"`);
            });
        });

        describe('cds', () => {
            test('cap-start', async () => {
                const service = await testRead(PROJECTS.V4_CDS_START.root, [], 'IncidentService');
                const metadata = service.getSchema();
                expect(serialize(metadata.schema, PROJECTS.V4_CDS_START.root)).toMatchSnapshot();
            });
        });
    });
    describe('insert', () => {
        describe('target', () => {
            const root = __dirname;
            test('with mock project', async () => {
                const project: Project = {
                    root,
                    projectType: 'EDMXBackend',
                    apps: {
                        '': {
                            appType: 'SAP Fiori elements',
                            appRoot: '',
                            i18n: {
                                'sap.app': '',
                                models: {}
                            },
                            changes: '',
                            manifest: join(root, 'webapp', 'manifest.json'),
                            mainService: '',
                            services: {
                                mainService: {
                                    local: join(root, 'webapp', 'localService', 'metadata.xml'),
                                    annotations: [
                                        {
                                            uri: join(root, 'webapp', 'annotations', 'annotation.xml'),
                                            local: join(root, 'webapp', 'annotations', 'annotation.xml')
                                        }
                                    ]
                                }
                            }
                        }
                    }
                };
                const volume = createVolume(project.root);
                const fileUri = pathToFileURL(join(project.root, 'webapp', 'annotations', 'annotation.xml')).toString();
                const text = await testEditWithMockData(
                    project,
                    [
                        createLineItem(fileUri, [
                            {
                                type: DATA_FIELD_TYPE,
                                propertyValues: [
                                    {
                                        name: 'Value',
                                        value: {
                                            type: 'PropertyPath',
                                            PropertyPath: 'path'
                                        }
                                    }
                                ]
                            }
                        ])
                    ],
                    volume
                );

                expect(text).toMatchSnapshot();
            });

            createEditTestCase({
                name: 'with no annotations',
                projectTestModels: TEST_TARGETS,
                getChanges: (files) => [createLineItem(files.annotations, [])]
            });

            createEditTestCase({
                name: 'with existing annotation',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [])],
                getChanges: (files) => [createLineItem(files.annotations, [], 'second')]
            });

            createEditTestCase({
                name: 'two annotations',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: () => [],
                getChanges: (files) => [
                    createLineItem(files.annotations, []),
                    createLineItem(files.annotations, [], 'second'),
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: `${targetName}/property`,
                            value: {
                                term: `${COMMON}.Text`,
                                value: {
                                    type: 'Path',
                                    Path: 'something'
                                }
                            }
                        }
                    }
                ]
            });

            // test is only applicable for CDS

            function createChart(uri: string, qualifier?: string): InsertAnnotationChange {
                return {
                    kind: ChangeType.InsertAnnotation,
                    uri,
                    content: {
                        type: 'annotation',
                        target: TARGET_INCIDENTS,
                        value: {
                            term: CHART,
                            qualifier,
                            record: {
                                type: 'com.sap.vocabularies.UI.v1.ChartDefinitionType',
                                propertyValues: [
                                    {
                                        name: 'MeasureAttributes',
                                        value: {
                                            type: 'Collection',
                                            Collection: [
                                                {
                                                    type: 'com.sap.vocabularies.UI.v1.ChartMeasureAttributeType',
                                                    propertyValues: [
                                                        {
                                                            name: 'Measure',
                                                            value: {
                                                                type: 'PropertyPath',
                                                                PropertyPath: 'IncidentsPerCategory'
                                                            }
                                                        },
                                                        {
                                                            name: 'Role',
                                                            value: {
                                                                type: 'EnumMember',
                                                                EnumMember: 'UI.ChartMeasureRoleType/Axis1'
                                                            }
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        name: 'Measures',
                                        value: {
                                            type: 'Collection',
                                            Collection: [{ type: 'PropertyPath', PropertyPath: 'IncidentsPerCategory' }]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                };
            }
            createEditTestCase({
                name: 'with reference to virtual property',
                projectTestModels: TEST_TARGETS.filter((target) => target === PROJECTS.V4_CDS_START),
                getInitialChanges: () => [],
                getChanges: (files) => [createChart(files.annotations)]
            });

            test('insert target with composition', async () => {
                const project = PROJECTS.V4_CDS_START;
                const root = project.root;
                const fsEditor = await createFsEditorForProject(root);
                const servicePath = pathFromUri(project.files.metadata);
                const serviceContent = fsEditor.read(servicePath);
                const updatedServiceFile = `${serviceContent}
                annotate service.Incidents.composition with @UI.LineItem: [] {
                    name @Common.Text: 'test';
                };
                `;

                fsEditor.write(servicePath, updatedServiceFile);
                const path = pathFromUri(project.files.schema);
                const content = fsEditor.read(path);
                const updatedSchemaFile = content.replace(
                    'on processingThreshold.incident = $self;',
                    `on processingThreshold.incident = $self;
    composition : Composition of many {
        key pos : Integer;
        name : String;
    };
`
                );
                fsEditor.write(path, updatedSchemaFile);
                const text = await testEdit(
                    root,
                    [],
                    [
                        {
                            kind: ChangeType.InsertAnnotation,
                            content: {
                                type: 'annotation',
                                target: `${TARGET_INCIDENTS}_composition`,
                                value: {
                                    term: `${UI}.LineItem`,
                                    collection: []
                                }
                            },
                            uri: project.files.annotations
                        },
                        {
                            kind: ChangeType.InsertAnnotation,
                            content: {
                                type: 'annotation',
                                target: `${TARGET_INCIDENTS}_composition/name`,
                                value: {
                                    term: `${COMMON}.Text`,
                                    value: {
                                        type: 'String',
                                        String: 'Something'
                                    }
                                }
                            },
                            uri: project.files.annotations
                        }
                    ],
                    'IncidentService',
                    fsEditor,
                    false
                );

                expect(text).toMatchSnapshot();
            });

            createEditTestCase({
                name: 'with reference to virtual property (avoid duplicates)',
                projectTestModels: TEST_TARGETS.filter((target) => target === PROJECTS.V4_CDS_START),
                getInitialChanges: (files) => [createChart(files.annotations)],
                getChanges: (files) => [createChart(files.annotations, 'second')]
            });
        });
        describe('reference', () => {
            createEditTestCase({
                name: 'new vocabulary',
                projectTestModels: TEST_TARGETS,
                getChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: 'Analytics.AggregatedProperty'
                            }
                        }
                    }
                ]
            });
            // relevant only for XML
            createEditTestCase({
                name: 'new vocabulary from annotation path',
                projectTestModels: TEST_TARGETS.filter((target) => target === PROJECTS.V4_XML_START),
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: TARGET_INCIDENTS,
                            value: {
                                term: `${UI}.AggregatedProperty`,
                                qualifier: 'TransformationAgg1_min',
                                record: {
                                    propertyValues: [
                                        {
                                            name: 'Name',
                                            value: {
                                                type: 'String',
                                                String: 'TransformationAgg1_min'
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: TARGET_INCIDENTS,
                            value: {
                                term: `${UI}.PresentationVariant`,
                                record: {
                                    propertyValues: [
                                        {
                                            name: 'SortOrder',
                                            value: {
                                                type: 'Record',
                                                Record: {
                                                    propertyValues: [
                                                        {
                                                            name: 'DynamicProperty',
                                                            value: {
                                                                type: 'AnnotationPath',
                                                                AnnotationPath:
                                                                    '@Analytics.AggregatedProperty#TransformationAgg1_min'
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'delete and insert in the same target',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [createDataWithLabel('one')], 'test0', TARGET_INCIDENTS)
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: TARGET_INCIDENTS,
                            term: `${UI}.LineItem`,
                            qualifier: 'test0'
                        },
                        uri: files.annotations,
                        pointer: ''
                    },
                    createLineItem(files.annotations, [], 'test1', TARGET_INCIDENTS)
                ]
            });
        });

        describe('embedded annotation', () => {
            createEditTestCase({
                name: 'in nested record',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: LINE_ITEM,
                                collection: [
                                    {
                                        type: 'UI.DataField',
                                        propertyValues: []
                                    }
                                ]
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.InsertEmbeddedAnnotation,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: '/collection/0',
                        content: {
                            type: 'embedded-annotation',
                            value: {
                                term: 'UI.Hidden',
                                value: { type: 'Bool', Bool: true }
                            }
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'and update collection',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: LINE_ITEM,
                                collection: [
                                    {
                                        type: 'UI.DataField',
                                        propertyValues: []
                                    }
                                ]
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.InsertEmbeddedAnnotation,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: '',
                        content: {
                            type: 'embedded-annotation',
                            value: {
                                term: 'UI.Criticality',
                                value: { type: 'Path', Path: 'value' }
                            }
                        }
                    },
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: '/collection',
                        content: {
                            type: 'collection',
                            value: [
                                {
                                    type: 'UI.DataFieldForAnnotation',
                                    propertyValues: []
                                }
                            ]
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'in root',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.InsertEmbeddedAnnotation,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: '',
                        content: {
                            type: 'embedded-annotation',
                            value: {
                                term: 'UI.Hidden',
                                value: { type: 'Bool', Bool: true }
                            }
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'text arrangement',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: `${TARGET_INCIDENTS}/category`,
                            value: {
                                term: `${COMMON}.Text`,
                                value: {
                                    type: 'Path',
                                    Path: 'test'
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        pointer: '/value/Path',
                        reference: {
                            target: `${TARGET_INCIDENTS}/category`,
                            term: `${COMMON}.Text`
                        },
                        uri: files.annotations,
                        content: {
                            type: 'primitive',
                            value: 'descr',
                            expressionType: 'Path'
                        }
                    },
                    {
                        kind: ChangeType.InsertEmbeddedAnnotation,
                        reference: {
                            target: `${TARGET_INCIDENTS}/category`,
                            term: `${COMMON}.Text`
                        },
                        uri: files.annotations,
                        pointer: '',
                        content: {
                            type: 'embedded-annotation',
                            value: {
                                term: `${UI}.TextArrangement`,
                                value: { type: 'EnumMember', EnumMember: `${UI}.TextArrangementType/TextFirst` }
                            }
                        }
                    }
                ]
            });
            const reference = {
                target: targetName,
                term: LINE_ITEM
            };
            createEditTestCase({
                name: 'subsequent inserts',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: () => [],
                getChanges: (files) => [
                    createLineItem(files.annotations, []),
                    {
                        kind: ChangeType.InsertEmbeddedAnnotation,
                        reference,
                        uri: files.annotations,
                        pointer: '',
                        content: {
                            type: 'embedded-annotation',
                            value: {
                                term: 'UI.Hidden',
                                value: { type: 'Bool', Bool: true }
                            }
                        }
                    },
                    {
                        kind: ChangeType.Insert,
                        reference,
                        uri: files.annotations,
                        pointer: 'collection',
                        content: {
                            type: 'record',
                            value: {
                                type: 'UI.DataField',
                                propertyValues: [
                                    {
                                        name: 'Value',
                                        value: {
                                            type: 'Path',
                                            Path: 'a'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'annotation with record value',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: FIELD_GROUP,
                                record: {
                                    propertyValues: [
                                        {
                                            name: 'Data',
                                            value: {
                                                type: 'Collection',
                                                Collection: []
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.InsertEmbeddedAnnotation,
                        reference: {
                            target: targetName,
                            term: FIELD_GROUP
                        },
                        uri: files.annotations,
                        pointer: '',
                        content: {
                            type: 'embedded-annotation',
                            value: {
                                term: 'UI.Hidden'
                            }
                        }
                    }
                ]
            });
        });

        describe('record', () => {
            createEditTestCase({
                name: 'in line item',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection',
                        content: {
                            type: 'record',
                            value: createDataField()
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'in the middle of collection of property',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: FIELD_GROUP,
                                record: {
                                    propertyValues: [
                                        {
                                            name: 'Data',
                                            value: {
                                                type: 'Collection',
                                                Collection: [
                                                    createDataField('test1'),
                                                    createDataField('test2'),
                                                    createDataField('test3')
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: FIELD_GROUP
                        },
                        uri: files.annotations,
                        pointer: 'record/propertyValues/0/value/Collection',
                        content: {
                            type: 'record',
                            value: createDataField('test4')
                        },
                        index: 3
                    }
                ]
            });
            createEditTestCase({
                name: 'replace propertyValue attribute and value (String to Path)',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: DATA_POINT,
                                record: {
                                    propertyValues: [
                                        {
                                            name: 'Value',
                                            value: {
                                                type: 'String',
                                                String: 'testString'
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: DATA_POINT
                        },
                        uri: files.annotations,
                        pointer: 'record/propertyValues/0/value',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'Path',
                                Path: 'testPath'
                            }
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'update value to null',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: DATA_POINT,
                                record: {
                                    propertyValues: [
                                        {
                                            name: 'Value',
                                            value: {
                                                type: 'String',
                                                String: 'testString'
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: DATA_POINT
                        },
                        uri: files.annotations,
                        pointer: 'record/propertyValues/0/value',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'Null'
                            }
                        }
                    }
                ]
            });
            createEditTestCase({
                name: "update propertyValue value 'string' value",
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: DATA_POINT,
                                record: {
                                    propertyValues: [
                                        {
                                            name: 'Value',
                                            value: {
                                                type: 'String',
                                                String: 'testString'
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: DATA_POINT
                        },
                        uri: files.annotations,
                        pointer: 'record/propertyValues/0/value',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'String',
                                String: 'new string'
                            }
                        }
                    }
                ]
            });
        });
        describe('collection', () => {
            createEditTestCase({
                name: 'in line item',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: LINE_ITEM
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: '',
                        content: {
                            type: 'collection',
                            value: []
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'item',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [createDataWithLabel('one')])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection',
                        index: 0,
                        content: {
                            type: 'record',
                            value: createDataWithLabel('two')
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'empty collection',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [createDataWithLabel('one')])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: '/collection',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'Collection',
                                Collection: []
                            }
                        }
                    }
                ]
            });
        });

        describe('path', () => {
            createEditTestCase({
                name: 'in collection',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'Path',
                                Path: 'test_path'
                            }
                        }
                    }
                ]
            });
        });

        describe('property value', () => {
            createEditTestCase({
                name: 'in record',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [createDataField()])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues',
                        content: {
                            type: 'property-value',
                            value: {
                                name: 'Label',
                                value: {
                                    type: 'String',
                                    String: 'Test'
                                }
                            }
                        }
                    }
                ]
            });

            // relevant only for cds
            createEditTestCase({
                name: 'in record consider $Type',
                projectTestModels: TEST_TARGETS.filter((target) => target === PROJECTS.V4_CDS_START),
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [createDataField('path'), createDataField('path')])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues',
                        content: {
                            type: 'property-value',
                            value: {
                                name: 'Label',
                                value: {
                                    type: 'String',
                                    String: 'Test'
                                }
                            }
                        },
                        index: 0 // adjusts index if $Type/$value/$edmJson is found
                    },
                    {
                        kind: ChangeType.InsertEmbeddedAnnotation,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/1/annotations',
                        content: {
                            type: 'embedded-annotation',
                            value: {
                                term: `${UI}.Importance`,
                                value: {
                                    type: 'String',
                                    String: 'Test'
                                }
                            }
                        },
                        index: 0 // adjusts index if $Type/$value/$edmJson is found
                    }
                ]
            });

            createEditTestCase({
                name: 'in record without type',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [
                        createDataField('path', [], false),
                        createDataField('path', [], false)
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues',
                        content: {
                            type: 'property-value',
                            value: {
                                name: 'Label',
                                value: {
                                    type: 'String',
                                    String: 'Test'
                                }
                            }
                        },
                        index: 0 // index not adjusted as $Type/$value/$edmJson not found
                    },
                    {
                        kind: ChangeType.InsertEmbeddedAnnotation,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/1/annotations',
                        content: {
                            type: 'embedded-annotation',
                            value: {
                                term: `${UI}.Importance`,
                                value: {
                                    type: 'String',
                                    String: 'Test'
                                }
                            }
                        },
                        index: 0 // index not adjusted as $Type/$value/$edmJson not found
                    }
                ]
            });
        });

        describe('primitive value', () => {
            createEditTestCase({
                name: 'qualifier in annotation',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'qualifier',
                        content: {
                            type: 'primitive',
                            value: 'q',
                            expressionType: ExpressionType.Unknown
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'term name',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'term',
                        content: {
                            type: 'primitive',
                            value: FIELD_GROUP,
                            expressionType: ExpressionType.Unknown
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'type in record',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [
                        {
                            propertyValues: [
                                {
                                    name: 'Value',
                                    value: {
                                        type: 'PropertyPath',
                                        PropertyPath: 'path'
                                    }
                                }
                            ]
                        }
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/type',
                        content: {
                            type: 'primitive',
                            value: DATA_FIELD_TYPE,
                            expressionType: ExpressionType.Unknown
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'value in property value',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [
                        {
                            propertyValues: [
                                {
                                    name: 'Value',
                                    value: {
                                        type: 'Unknown'
                                    }
                                }
                            ]
                        }
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues/0/value',
                        content: {
                            type: 'primitive',
                            value: 'test',
                            expressionType: ExpressionType.String
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'null in property value',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [
                        {
                            propertyValues: [
                                {
                                    name: 'Value',
                                    value: {
                                        type: 'Unknown'
                                    }
                                }
                            ]
                        }
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues/0',
                        content: {
                            type: 'primitive',
                            value: 'test',
                            expressionType: ExpressionType.Null
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'in embedded annotation',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: TARGET_INCIDENTS,
                            value: {
                                term: LINE_ITEM,
                                collection: [
                                    {
                                        type: 'UI.DataField',
                                        propertyValues: [],
                                        annotations: [
                                            {
                                                term: `${UI}.Hidden`
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: TARGET_INCIDENTS,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: '/collection/0/annotations/0/value',
                        content: {
                            type: 'expression',
                            value: { type: 'Path', Path: 'Test' }
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'path in collection based on index',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createSelectionFields(files.annotations, [{ type: 'PropertyPath', PropertyPath: 'path1' }])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: targetName,
                            term: SELECTION_FIELDS
                        },
                        uri: files.annotations,
                        pointer: '/collection',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'PropertyPath',
                                PropertyPath: 'path2'
                            }
                        },
                        index: 0
                    }
                ]
            });
        });
    });
    describe('delete', () => {
        describe('annotation', () => {
            createEditTestCase({
                name: 'with no siblings',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: ''
                    }
                ]
            });
            function createDeleteChange(uri: string, qualifier: string): Change {
                return {
                    kind: ChangeType.Delete,
                    reference: {
                        target: targetName,
                        term: LINE_ITEM,
                        qualifier
                    },
                    uri,
                    pointer: ''
                };
            }

            createEditTestCase({
                name: 'all annotations',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [], 'a'),
                    createLineItem(files.annotations, [], 'b'),
                    createLineItem(files.annotations, [], 'c')
                ],
                getChanges: (files) => [
                    createDeleteChange(files.annotations, 'a'),
                    createDeleteChange(files.annotations, 'b'),
                    createDeleteChange(files.annotations, 'c')
                ]
            });
            createEditTestCase({
                name: 'with no qualifier',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, []),
                    createLineItem(files.annotations, [], 'qualifier')
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: ''
                    }
                ]
            });
            createEditTestCase({
                name: 'with qualifier',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, []),
                    createLineItem(files.annotations, [], 'qualifier')
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM,
                            qualifier: 'qualifier'
                        },
                        uri: files.annotations,
                        pointer: ''
                    }
                ]
            });

            createEditTestCase({
                name: 'on a property',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createValueListWithRecord(files.annotations, 'IncidentService.Incidents/category'),
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: 'IncidentService.Incidents/category',
                            value: {
                                term: VALUE_LIST_WITH_FIXED_VALUE,
                                value: {
                                    type: 'Bool',
                                    Bool: true
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: 'IncidentService.Incidents/category',
                            term: VALUE_LIST
                        },
                        uri: files.annotations,
                        pointer: ''
                    }
                ]
            });

            test('with cds annotation group', async () => {
                const project = PROJECTS.V4_CDS_START;
                const root = project.root;
                const fsEditor = await createFsEditorForProject(root);
                const path = pathFromUri(project.files.annotations);
                const content = fsEditor.read(path);
                const testData = `${content}
                using from '../../srv/common';
                annotate service.Incidents with {
                    priority @Common : {
                        Text : priority.name,
                        TextArrangement : #TextFirst,
                    }
                };
                `;
                fsEditor.write(path, testData);
                const text = await testEdit(
                    root,
                    [],
                    [
                        {
                            kind: ChangeType.Delete,
                            reference: {
                                target: 'IncidentService.Incidents/priority',
                                term: 'com.sap.vocabularies.Common.v1.TextArrangement'
                            },
                            uri: project.files.annotations,
                            pointer: ''
                        }
                    ],
                    'IncidentService',
                    fsEditor,
                    false
                );

                expect(text).toMatchSnapshot();
            });

            describe('embedded annotation', () => {
                createEditTestCase({
                    name: 'from nested record',
                    projectTestModels: TEST_TARGETS,
                    getInitialChanges: (files) => [
                        {
                            kind: ChangeType.InsertAnnotation,
                            uri: files.annotations,
                            content: {
                                type: 'annotation',
                                target: targetName,
                                value: {
                                    term: LINE_ITEM,
                                    collection: [
                                        {
                                            type: 'UI.DataField',
                                            propertyValues: [],
                                            annotations: [
                                                {
                                                    term: 'UI.Hidden',
                                                    value: { type: 'Bool', Bool: true }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    getChanges: (files) => [
                        {
                            kind: ChangeType.Delete,
                            reference: {
                                target: targetName,
                                term: LINE_ITEM
                            },
                            uri: files.annotations,
                            pointer: '/collection/0/annotations/0'
                        }
                    ]
                });

                createEditTestCase({
                    name: 'from root',
                    projectTestModels: TEST_TARGETS,
                    getInitialChanges: (files) => [
                        {
                            kind: ChangeType.InsertAnnotation,
                            uri: files.annotations,
                            content: {
                                type: 'annotation',
                                target: targetName,
                                value: {
                                    term: LINE_ITEM,
                                    collection: [],
                                    annotations: [
                                        {
                                            term: 'UI.Hidden',
                                            value: { type: 'Bool', Bool: true }
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    getChanges: (files) => [
                        {
                            kind: ChangeType.Delete,
                            reference: {
                                target: targetName,
                                term: LINE_ITEM
                            },
                            uri: files.annotations,
                            pointer: '/annotations/0'
                        }
                    ]
                });
            });
        });
        describe('record', () => {
            createEditTestCase({
                name: 'complete value',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [createDataField()])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0'
                    }
                ]
            });
        });
        describe('property value', () => {
            createEditTestCase({
                name: 'element',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [createDataField()])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues/0/value'
                    }
                ]
            });
            createEditTestCase({
                name: 'second property',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [
                        {
                            type: DATA_FIELD_TYPE,
                            propertyValues: [
                                {
                                    name: 'Property1',
                                    value: {
                                        type: 'PropertyPath',
                                        PropertyPath: 'path1'
                                    }
                                },
                                {
                                    name: 'Property2',
                                    value: {
                                        type: 'PropertyPath',
                                        PropertyPath: 'path2'
                                    }
                                }
                            ]
                        }
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues/1'
                    }
                ]
            });
        });
        describe('qualifier', () => {
            createEditTestCase({
                name: 'value',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [], 'general')],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM,
                            qualifier: 'general'
                        },
                        uri: files.annotations,
                        pointer: 'qualifier'
                    }
                ]
            });
        });
        describe('primitive values', () => {
            const collection = [
                {
                    type: 'EnumMember',
                    EnumMember: CHART_TYPE_BAR
                },
                {
                    type: 'String',
                    String: 'text'
                },
                {
                    type: 'Path',
                    Path: 'path'
                },
                {
                    type: 'Path',
                    Path: 'path'
                },
                {
                    type: 'PropertyPath',
                    PropertyPath: 'PropertyPath'
                },
                {
                    type: 'AnnotationPath',
                    AnnotationPath: 'AnnotationPath'
                },
                {
                    type: 'Null'
                },
                {
                    type: 'Bool',
                    Bool: false
                },
                {
                    type: 'Int',
                    Int: 5
                },
                {
                    type: 'Decimal',
                    Decimal: 5.22
                },
                {
                    type: 'Float',
                    Float: 3.1415
                }
            ] as unknown as Collection;
            createEditTestCase({
                name: 'combined',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: LINE_ITEM,
                                collection
                            }
                        }
                    }
                ],
                getChanges: (files) =>
                    Array.from(
                        { length: collection.length },
                        (_, i): DeleteChange => ({
                            kind: ChangeType.Delete,
                            pointer: `collection/${i}`,
                            reference: {
                                target: targetName,
                                term: LINE_ITEM
                            },
                            uri: files.annotations
                        })
                    )
            });
        });
    });
    describe('update', () => {
        describe('fully qualified names', () => {
            createEditTestCase({
                name: 'enum member',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: CHART,
                                record: {
                                    type: CHART_DEFINITION_TYPE,
                                    propertyValues: [
                                        {
                                            name: 'ChartType',
                                            value: {
                                                type: 'EnumMember',
                                                EnumMember: CHART_TYPE_BAR
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: CHART
                        },
                        uri: files.annotations,
                        pointer: 'record/propertyValues/0/value',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'EnumMember',
                                EnumMember: CHART_TYPE_COLUMN
                            }
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'enum member flags',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: CONTACT,
                                record: {
                                    propertyValues: [
                                        {
                                            name: 'tel',
                                            value: {
                                                type: 'Collection',
                                                Collection: [
                                                    {
                                                        type: PHONE_NUMBER_TYPE,
                                                        propertyValues: [
                                                            {
                                                                name: 'type',
                                                                value: {
                                                                    type: 'EnumMember',
                                                                    EnumMember: [PHONE_TYPE_WORK, PHONE_TYPE_CELL].join(
                                                                        ' '
                                                                    )
                                                                }
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: CONTACT
                        },
                        uri: files.annotations,
                        pointer: 'record/propertyValues/0/value/Collection/0/propertyValues/0/value',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'EnumMember',
                                EnumMember: [PHONE_TYPE_WORK, PHONE_TYPE_CELL, PHONE_TYPE_PREFERRED].join(' ')
                            }
                        }
                    }
                ]
            });
        });
        describe('qualifier', () => {
            createEditTestCase({
                name: 'value',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [], 'general')],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM,
                            qualifier: 'general'
                        },
                        uri: files.annotations,
                        pointer: 'qualifier',
                        content: {
                            type: 'primitive',
                            value: 'OtherValue'
                        }
                    }
                ]
            });
        });

        describe('PropertyValue - PropertyPath', () => {
            createEditTestCase({
                name: 'namespace alias',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            target: targetName,
                            type: 'annotation',
                            value: {
                                term: `${UI}.Facets`,
                                collection: [
                                    {
                                        type: `${UI}.ReferenceFacet`,
                                        propertyValues: [
                                            {
                                                name: 'Target',
                                                value: {
                                                    type: 'AnnotationPath',
                                                    AnnotationPath:
                                                        'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem#test'
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: `${UI}.Facets`
                        },
                        uri: files.annotations,
                        pointer: '/collection/0/propertyValues/0/value/AnnotationPath',
                        content: {
                            type: 'primitive',
                            expressionType: 'AnnotationPath',
                            value: 'incidentFlow/@com.sap.vocabularies.UI.v1.PresentationVariant#testsection'
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'replace text content',
                projectTestModels: TEST_TARGETS.filter((target) => target === PROJECTS.V4_XML_START),
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            target: TARGET_INCIDENTS,
                            type: 'annotation',
                            value: {
                                term: SELECTION_FIELDS,
                                qualifier: 'abc',
                                collection: [
                                    {
                                        PropertyPath: 'BookingFee',
                                        type: 'PropertyPath'
                                    }
                                ]
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: TARGET_INCIDENTS,
                            term: SELECTION_FIELDS,
                            qualifier: 'abc'
                        },
                        uri: files.annotations,
                        pointer: '/collection/0/PropertyPath',
                        content: {
                            type: 'primitive',
                            expressionType: 'PropertyPath',
                            value: 'createdBy'
                        }
                    }
                ]
            });

            createEditTestCase({
                name: 'change element',
                projectTestModels: TEST_TARGETS.filter((target) => target === PROJECTS.V4_XML_START),
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            target: TARGET_INCIDENTS,
                            type: 'annotation',
                            value: {
                                term: SELECTION_FIELDS,
                                qualifier: 'abc',
                                collection: [
                                    {
                                        PropertyPath: 'BookingFee',
                                        type: 'PropertyPath'
                                    }
                                ]
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: TARGET_INCIDENTS,
                            term: SELECTION_FIELDS,
                            qualifier: 'abc'
                        },
                        uri: files.annotations,
                        pointer: '/collection/0/PropertyPath',
                        content: {
                            type: 'primitive',
                            expressionType: 'AnnotationPath',
                            value: 'createdBy'
                        }
                    }
                ]
            });
        });

        describe('collection', () => {
            createEditTestCase({
                name: 'collection in record',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: targetName,
                            value: {
                                term: 'com.sap.vocabularies.UI.v1.PresentationVariant',
                                value: {
                                    type: 'Record',
                                    Record: {
                                        propertyValues: [
                                            {
                                                name: 'SortOrder',
                                                value: {
                                                    type: 'Collection',
                                                    Collection: []
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: 'com.sap.vocabularies.UI.v1.PresentationVariant'
                        },
                        uri: files.annotations,
                        pointer: '/record/propertyValues/0/value/Collection',
                        content: {
                            type: 'collection',
                            value: [
                                {
                                    type: 'com.sap.vocabularies.Common.v1.SortOrderType',
                                    propertyValues: [
                                        {
                                            name: 'Property',
                                            value: {
                                                type: 'PropertyPath',
                                                PropertyPath: 'name'
                                            }
                                        },
                                        {
                                            name: 'Descending',
                                            value: {
                                                type: 'Bool',
                                                Bool: false
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'complete',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection',
                        content: {
                            type: 'collection',
                            value: [createDataField()]
                        }
                    }
                ]
            });

            const criticality: RawAnnotation = {
                term: CRITICALITY,
                value: {
                    type: 'PropertyPath',
                    PropertyPath: 'criticality'
                }
            };

            createEditTestCase({
                name: 'collection with annotation',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItemWithAnnotations(files.annotations, [createDataField()], [criticality])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection',
                        content: {
                            type: 'collection',
                            value: [createDataField(), createDataField('path2')],
                            annotations: [criticality]
                        }
                    }
                ]
            });
        });
        describe('record', () => {
            const record: AnnotationRecord = {
                type: 'com.sap.vocabularies.Common.v1.ValueListType',
                propertyValues: [
                    {
                        name: 'Parameters',
                        value: {
                            type: 'Collection',
                            Collection: []
                        }
                    },
                    { name: 'CollectionPath', value: { type: 'String', String: 'Incidents' } },
                    { name: 'SearchSupported', value: { type: 'Bool', Bool: true } }
                ]
            };
            createEditTestCase({
                name: 'complete',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: 'IncidentService.Incidents/ID',
                            value: {
                                term: 'com.sap.vocabularies.Common.v1.ValueList',
                                record
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        pointer: 'record',
                        reference: {
                            target: 'IncidentService.Incidents/ID',
                            term: 'com.sap.vocabularies.Common.v1.ValueList'
                        },
                        content: {
                            type: 'record',
                            value: record
                        },
                        uri: files.annotations
                    }
                ]
            });
            createEditTestCase({
                name: 'empty value',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: files.annotations,
                        content: {
                            type: 'annotation',
                            target: 'IncidentService.Incidents',
                            value: {
                                term: 'com.sap.vocabularies.UI.v1.KPI',
                                qualifier: 'dummyQualifierKPI'
                            }
                        }
                    }
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        pointer: 'record',
                        uri: files.annotations,
                        reference: {
                            target: 'IncidentService.Incidents',
                            term: 'com.sap.vocabularies.UI.v1.KPI',
                            qualifier: 'dummyQualifierKPI'
                        },
                        content: {
                            type: 'record',
                            value: {
                                type: 'com.sap.vocabularies.UI.v1.KPIType',
                                propertyValues: [{ name: 'ID', value: { type: 'String', String: 'kpiId' } }]
                            }
                        }
                    }
                ]
            });
        });
        describe('property value', () => {
            createEditTestCase({
                name: 'complete',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [createDataField()])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues/0',
                        content: {
                            type: 'property-value',
                            value: {
                                name: 'Label',
                                value: {
                                    type: 'String',
                                    String: 'Test'
                                }
                            }
                        }
                    }
                ]
            });
        });
        describe('expression', () => {
            createEditTestCase({
                name: 'enum',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [
                        {
                            type: DATA_FIELD_TYPE,
                            propertyValues: [
                                {
                                    name: 'Label',
                                    value: {
                                        type: 'EnumMember',
                                        EnumMember: 'one'
                                    }
                                }
                            ]
                        }
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues/0/value',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'EnumMember',
                                EnumMember: 'two'
                            }
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'change from and to flags',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createCommunicationContact(files.annotations, `${TARGET_INCIDENTS}/category`, [
                        PHONE_TYPE_WORK,
                        [PHONE_TYPE_WORK, PHONE_TYPE_CELL].join(' ')
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: `${TARGET_INCIDENTS}/category`,
                            term: CONTACT
                        },
                        uri: files.annotations,
                        pointer: 'record/propertyValues/0/value/Collection/0/propertyValues/0/value',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'EnumMember',
                                EnumMember: [PHONE_TYPE_WORK, PHONE_TYPE_CELL].join(' ')
                            }
                        }
                    },
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: `${TARGET_INCIDENTS}/category`,
                            term: CONTACT
                        },
                        uri: files.annotations,
                        pointer: 'record/propertyValues/0/value/Collection/1/propertyValues/0/value',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'EnumMember',
                                EnumMember: PHONE_TYPE_WORK
                            }
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'change from and to flags (option 2)',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createCommunicationContact(files.annotations, `${TARGET_INCIDENTS}/category`, [
                        PHONE_TYPE_WORK,
                        [PHONE_TYPE_WORK, PHONE_TYPE_CELL].join(' ')
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: `${TARGET_INCIDENTS}/category`,
                            term: CONTACT
                        },
                        uri: files.annotations,
                        pointer: 'record/propertyValues/0/value/collection/0/propertyValues/0/value',
                        content: {
                            type: 'primitive',
                            expressionType: 'EnumMember',
                            value: [PHONE_TYPE_WORK, PHONE_TYPE_CELL].join(' ')
                        }
                    },
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: `${TARGET_INCIDENTS}/category`,
                            term: CONTACT
                        },
                        uri: files.annotations,
                        pointer: 'record/propertyValues/0/value/collection/1/propertyValues/0/value',
                        content: {
                            type: 'primitive',
                            expressionType: 'EnumMember',
                            value: PHONE_TYPE_WORK
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'change type',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [createDataWithLabel()])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues/0/value',
                        content: {
                            type: 'expression',
                            previousType: 'String',
                            value: {
                                type: 'Path',
                                Path: 'new_path'
                            }
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'does not change type',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [createDataWithLabel()])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues/0/value',
                        content: {
                            type: 'expression',
                            value: {
                                type: 'String',
                                String: 'New Label'
                            }
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'primitive type',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [createLineItem(files.annotations, [createDataWithLabel()])],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/propertyValues/0/value/String',
                        content: {
                            type: 'primitive',
                            value: 'New Label',
                            expressionType: 'String'
                        }
                    }
                ]
            });
            createEditTestCase({
                name: 'enum member on record annotation',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItemWithAnnotations(
                        files.annotations,
                        [
                            createDataField('path', [
                                {
                                    term: `${UI}.Importance`,
                                    value: {
                                        type: 'EnumMember',
                                        EnumMember: `${UI}.ImportanceType/High`
                                    }
                                }
                            ])
                        ],
                        []
                    )
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Update,
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        uri: files.annotations,
                        pointer: 'collection/0/annotations/0/value/EnumMember',
                        content: {
                            type: 'primitive',
                            expressionType: 'EnumMember',
                            value: `${UI}.ImportanceType/Medium`
                        }
                    }
                ]
            });
        });
    });
    describe('using change', () => {
        test('embedded annotation', async () => {
            const project = PROJECTS.V4_CDS_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const mdPath = pathFromUri(project.files.metadata);
            const mdContent = fsEditor.read(mdPath);
            const mdTestData = `${mdContent}
            annotate service.Individual with {
                createdAt @Common : {
                    Text            : {
                        ![@UI.TextArrangement] : #TextFirst,
                        $value: createdBy,
                    },
                }
            };`;
            fsEditor.write(mdPath, mdTestData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        kind: ChangeType.InsertAnnotation,
                        uri: project.files.annotations,
                        content: {
                            target: 'IncidentService.Individual/createdAt',
                            type: 'annotation',
                            value: {
                                term: 'com.sap.vocabularies.Common.v1.Text',
                                annotations: [
                                    {
                                        term: `${UI}.TextArrangement`,
                                        value: { type: 'EnumMember', EnumMember: `${UI}.TextArrangementType/TextFirst` }
                                    }
                                ]
                            }
                        }
                    }
                ],
                'IncidentService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });
    });
    describe('move', () => {
        describe('collection - record', () => {
            createEditTestCase({
                name: 'different parents',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(
                        files.annotations,
                        [createDataField(), createDataField('test1'), createDataField('test2')],
                        'a'
                    ),
                    createLineItem(files.annotations, [], 'b')
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Move,
                        uri: files.annotations,
                        pointer: 'collection',
                        reference: {
                            target: targetName,
                            term: LINE_ITEM,
                            qualifier: 'b'
                        },
                        moveReference: [
                            {
                                fromPointer: ['collection/0', 'collection/1'],
                                reference: {
                                    target: targetName,
                                    term: LINE_ITEM,
                                    qualifier: 'a'
                                }
                            }
                        ],
                        index: 0
                    }
                ]
            });
            createEditTestCase({
                name: 'before first record',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [
                        createDataField(),
                        createDataField('test1'),
                        createDataField('test2'),
                        createDataField('test3'),
                        createDataField('test4'),
                        createDataField('test5')
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Move,
                        uri: files.annotations,
                        pointer: 'collection',
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        moveReference: [
                            {
                                fromPointer: ['collection/2', 'collection/4'],
                                reference: {
                                    target: targetName,
                                    term: LINE_ITEM
                                }
                            }
                        ],
                        index: 0
                    }
                ]
            });
            createEditTestCase({
                name: 'before first 5th element',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [
                        createDataField(),
                        createDataField('test1'),
                        createDataField('test2'),
                        createDataField('test3'),
                        createDataField('test4'),
                        createDataField('test5')
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Move,
                        uri: files.annotations,
                        pointer: 'collection',
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        },
                        moveReference: [
                            {
                                fromPointer: ['collection/1', 'collection/2'],
                                reference: {
                                    target: targetName,
                                    term: LINE_ITEM
                                }
                            }
                        ],
                        index: 4
                    }
                ]
            });
            createEditTestCase({
                name: 'to the end',
                projectTestModels: TEST_TARGETS,
                getInitialChanges: (files) => [
                    createLineItem(files.annotations, [
                        createDataField(),
                        createDataField('test1'),
                        createDataField('test2'),
                        createDataField('test3'),
                        createDataField('test4'),
                        createDataField('test5')
                    ])
                ],
                getChanges: (files) => [
                    {
                        kind: ChangeType.Move,
                        moveReference: [
                            {
                                fromPointer: ['collection/2', 'collection/4'],
                                reference: {
                                    target: targetName,
                                    term: LINE_ITEM
                                }
                            }
                        ],
                        uri: files.annotations,
                        pointer: 'collection',
                        reference: {
                            target: targetName,
                            term: LINE_ITEM
                        }
                    }
                ]
            });
        });
    });
    describe('flattened annotations', () => {
        test('insert record property', async () => {
            const project = PROJECTS.V4_CDS_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const path = pathFromUri(project.files.annotations);
            const content = fsEditor.read(path);
            const testData = `${content}
            using from '../../srv/common';
            annotate IncidentService.Incidents with @(
                UI.HeaderInfo.TypeNamePlural : 'TypeNamePlural was here on app',
                UI.HeaderInfo.Title : {
                    Value : title,
                },
            );`;
            fsEditor.write(path, testData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        kind: ChangeType.Insert,
                        reference: {
                            target: TARGET_INCIDENTS,
                            term: `${UI}.HeaderInfo`
                        },
                        uri: project.files.annotations,
                        pointer: '/record/propertyValues',
                        content: {
                            type: 'property-value',
                            value: {
                                name: 'TypeName',
                                value: {
                                    type: 'String',
                                    String: 'My Type Name'
                                }
                            }
                        }
                    }
                ],
                'IncidentService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });

        test('delete record property value', async () => {
            const project = PROJECTS.V4_CDS_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const path = pathFromUri(project.files.annotations);
            const content = fsEditor.read(path);
            const testData = `${content}
            annotate IncidentService.Incidents with @(
                UI.HeaderInfo.TypeNamePlural : 'TypeNamePlural was here on app',
                UI.HeaderInfo.Description : {
                    Value : title,
                },
                UI.HeaderInfo : {
                    Title.Value: title
                }
            );`;
            fsEditor.write(path, testData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: TARGET_INCIDENTS,
                            term: `${UI}.HeaderInfo`
                        },
                        uri: project.files.annotations,
                        pointer: '/record/propertyValues/0/value'
                    },
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: TARGET_INCIDENTS,
                            term: `${UI}.HeaderInfo`
                        },
                        uri: project.files.annotations,
                        pointer: '/record/propertyValues/1/value/Record/propertyValues/0/value'
                    },
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: TARGET_INCIDENTS,
                            term: `${UI}.HeaderInfo`
                        },
                        uri: project.files.annotations,
                        pointer: '/record/propertyValues/2/record/propertyValues/0/value'
                    }
                ],
                'IncidentService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });

        test('delete common text and textArrangement', async () => {
            const project = PROJECTS.V4_CDS_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const path = pathFromUri(project.files.annotations);
            const content = fsEditor.read(path);
            const testData = `${content}
            annotate IncidentService.Incidents with { 
                assignedIndividual @Common: {
                                                Text: assignedIndividual.modifiedBy, 
                                                TextArrangement : #TextLast 
                                            } };
            `;
            fsEditor.write(path, testData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: 'IncidentService.Incidents/assignedIndividual',
                            term: `${COMMON}.Text`
                        },
                        uri: project.files.annotations,
                        pointer: ''
                    },
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: 'IncidentService.Incidents/assignedIndividual',
                            term: `${COMMON}.TextArrangement`
                        },
                        uri: project.files.annotations,
                        pointer: ''
                    }
                ],
                'IncidentService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });

        test('multiple levels', async () => {
            const project = PROJECTS.V4_CDS_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const path = pathFromUri(project.files.annotations);
            const content = fsEditor.read(path);
            const testData = `${content}
            annotate IncidentService.Incidents with @(
                UI.KPI.DataPoint.Value: 'A',
                UI.KPI.DataPoint : {
                    Responsible.nickname: 'B',
                    Responsible.fn: 'Test'
                },
            );`;
            // UI.KPI.DataPoint record/0
            // UI.KPI.DataPoint.value record/0/record/0
            // UI.KPI.DataPoint.Responsible.nickname: record/0/record/1/record/0
            // UI.KPI.DataPoint.Responsible.fn: record/0/record/1/record/1
            fsEditor.write(path, testData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: TARGET_INCIDENTS,
                            term: `${UI}.KPI`
                        },
                        uri: project.files.annotations,
                        pointer: '/record/propertyValues/0/value/Record/propertyValues/1/value/Record/propertyValues/0'
                    }
                ],
                'IncidentService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });
    });
});

describe('serializeTarget', () => {
    describe('xml', () => {
        test('v4-app', async () => {
            const service = await testRead(PROJECTS.V4_XML_START.root, []);

            const targetPath = 'SEPMRA_PROD_MAN.SEPMRA_C_PD_ProductType';
            const annotation: RawAnnotation = {
                term: 'com.sap.vocabularies.UI.v1.Facets',
                collection: [
                    {
                        type: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
                        propertyValues: [
                            { name: 'Label', value: { type: 'String', String: 'Sales' } },
                            { name: 'ID', value: { type: 'String', String: 'Sales' } },
                            {
                                name: 'Target',
                                value: {
                                    type: 'AnnotationPath',
                                    AnnotationPath: 'to_ProductSalesData/@com.sap.vocabularies.UI.v1.Chart'
                                }
                            }
                        ]
                    }
                ]
            };
            const result = service.serializeTarget({ target: targetPath, annotations: [annotation] });
            expect(result).toMatchSnapshot();
        });

        test('move section case 1', async () => {
            const project = PROJECTS.V4_XML_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const path = pathFromUri(project.files.annotations);
            const content = fsEditor.read(path);
            const testData = `${content.replace(
                '</Schema>',
                `
                <Annotations Target="IncidentService.Incidents">
                    <Annotation Term="UI.Facets">
                        <Collection>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="Label" String="group 1"/>
                                <PropertyValue Property="ID" String="group1"/>
                                <PropertyValue Property="Facets">
                                    <Collection/>
                                </PropertyValue>
                            </Record>
                            <Record Type="UI.ReferenceFacet">
                                                     <PropertyValue Property="Label" String="test 1"/>
                                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup"/>
                                        <Annotation Term="UI.Hidden"/>
                  <PropertyValue Property="ID" String="formsection"/>
                            </Record>
                        </Collection>
                    </Annotation>
                </Annotations>
            </Schema>`
            )}
            `;
            fsEditor.write(path, testData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        index: 0,
                        kind: ChangeType.Move,
                        uri: project.files.annotations,
                        reference: {
                            term: 'com.sap.vocabularies.UI.v1.Facets',
                            target: 'IncidentService.Incidents',
                            qualifier: ''
                        },
                        pointer: '/collection/0/propertyValues/2/value/Collection',
                        moveReference: [
                            {
                                fromPointer: ['/collection/1']
                            }
                        ]
                    }
                ],
                'mainService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });

        test('move section case 2', async () => {
            const project = PROJECTS.V4_XML_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const path = pathFromUri(project.files.annotations);
            const content = fsEditor.read(path);
            const testData = `${content.replace(
                '</Schema>',
                `
                <Annotations Target="IncidentService.Incidents">
                    <Annotation Term="UI.Facets">
                        <Collection>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="Label" String="group 1"/>
                                <PropertyValue Property="ID" String="group1"/>
                                <PropertyValue Property="Facets">
                                    <Collection/>
                                </PropertyValue>
                            </Record>
                <Record Type="UI.ReferenceFacet">
                    <PropertyValue Property="Label" String="test 1"/>
                </Record>
                        </Collection>
                    </Annotation>
                </Annotations>
            </Schema>`
            )}
            `;
            fsEditor.write(path, testData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        index: 0,
                        kind: ChangeType.Move,
                        uri: project.files.annotations,
                        reference: {
                            term: 'com.sap.vocabularies.UI.v1.Facets',
                            target: 'IncidentService.Incidents',
                            qualifier: ''
                        },
                        pointer: '/collection/0/propertyValues/2/value/Collection',
                        moveReference: [
                            {
                                fromPointer: ['/collection/1']
                            }
                        ]
                    }
                ],
                'mainService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });

        test('move section case 3', async () => {
            const project = PROJECTS.V4_XML_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const path = pathFromUri(project.files.annotations);
            const content = fsEditor.read(path);
            const testData = `${content.replace(
                '</Schema>',
                `
                <Annotations Target="IncidentService.Incidents">
                    <Annotation Term="UI.Facets">
                        <Collection>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="Label" String="group 1"/>
                                <PropertyValue Property="ID" String="group1"/>
                                <PropertyValue Property="Facets">
                                    <Collection/>
                                </PropertyValue>
                            </Record>
                                        <Record Type="UI.ReferenceFacet">
                                            <PropertyValue Property="Label" String="test 1"/>
                                        </Record>
                        </Collection>
                    </Annotation>
                </Annotations>
            </Schema>`
            )}
            `;
            fsEditor.write(path, testData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        index: 0,
                        kind: ChangeType.Move,
                        uri: project.files.annotations,
                        reference: {
                            term: 'com.sap.vocabularies.UI.v1.Facets',
                            target: 'IncidentService.Incidents',
                            qualifier: ''
                        },
                        pointer: '/collection/0/propertyValues/2/value/Collection',
                        moveReference: [
                            {
                                fromPointer: ['/collection/1']
                            }
                        ]
                    }
                ],
                'mainService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });

        test('move section case 4', async () => {
            const project = PROJECTS.V4_XML_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const path = pathFromUri(project.files.annotations);
            const content = fsEditor.read(path);
            const testData = `${content.replace(
                '</Schema>',
                `
<Annotations Target="IncidentService.Incidents">
<Annotation Term="UI.Facets">
<Collection>
<Record Type="UI.CollectionFacet">
<PropertyValue Property="Label" String="group 1"/>
<PropertyValue Property="ID" String="group1"/>
<PropertyValue Property="Facets">
<Collection/>
</PropertyValue>
</Record>
                                <Record Type="UI.ReferenceFacet">
                                    <PropertyValue Property="Label" String="test 1"/>
                <PropertyValue Property="ID" String="test"/>
    <PropertyValue Property="ID" String="group1"/>
                                </Record>
    </Collection>
</Annotation>
</Annotations>
</Schema>`
            )}
            `;
            fsEditor.write(path, testData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        index: 0,
                        kind: ChangeType.Move,
                        uri: project.files.annotations,
                        reference: {
                            term: 'com.sap.vocabularies.UI.v1.Facets',
                            target: 'IncidentService.Incidents',
                            qualifier: ''
                        },
                        pointer: '/collection/0/propertyValues/2/value/Collection',
                        moveReference: [
                            {
                                fromPointer: ['/collection/1']
                            }
                        ]
                    }
                ],
                'mainService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });

        test('move section case 5', async () => {
            const project = PROJECTS.V4_XML_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const path = pathFromUri(project.files.annotations);
            const content = fsEditor.read(path);
            const testData = `${content.replace(
                '</Schema>',
                `
                <Annotations Target="IncidentService.Incidents">
                    <Annotation Term="UI.Facets">
                        <Collection>
                            <Record Type="UI.CollectionFacet">
                                <PropertyValue Property="Label" String="group 1"/>
                                <PropertyValue Property="ID" String="group1"/>
                                <PropertyValue Property="Facets">
                                    <Collection/>
                                </PropertyValue>
                            </Record>
                             <Record Type="UI.ReferenceFacet">
                                 <PropertyValue Property="Label" String="test 1"/>
                             </Record>
                        </Collection>
                    </Annotation>
                </Annotations>
            </Schema>`
            )}
            `;
            fsEditor.write(path, testData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        index: 0,
                        kind: ChangeType.Move,
                        uri: project.files.annotations,
                        reference: {
                            term: 'com.sap.vocabularies.UI.v1.Facets',
                            target: 'IncidentService.Incidents',
                            qualifier: ''
                        },
                        pointer: '/collection/0/propertyValues/2/value/Collection',
                        moveReference: [
                            {
                                fromPointer: ['/collection/1']
                            }
                        ]
                    }
                ],
                'mainService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });
    });

    describe('cds', () => {
        test('cap-start', async () => {
            const service = await testRead(PROJECTS.V4_CDS_START.root, [], 'IncidentService');
            const targetPath = 'IncidentService.Incidents';
            const annotation: RawAnnotation = {
                term: 'com.sap.vocabularies.UI.v1.Facets',
                collection: [
                    {
                        type: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
                        propertyValues: [
                            { name: 'Label', value: { type: 'String', String: 'title' } },
                            { name: 'ID', value: { type: 'String', String: 'incidentID' } },
                            {
                                name: 'Target',
                                value: {
                                    type: 'AnnotationPath',
                                    AnnotationPath: '@UI.FieldGroup#GeneralInformation'
                                }
                            }
                        ]
                    }
                ]
            };
            const result = service.serializeTarget({ target: targetPath, annotations: [annotation] });
            expect(result).toMatchSnapshot();
        });

        test('Delete Criticality and criticality Representation', async () => {
            const project = PROJECTS.V4_CDS_START;
            const root = project.root;
            const fsEditor = await createFsEditorForProject(root);
            const path = pathFromUri(project.files.annotations);
            const content = fsEditor.read(path);
            const testData = `${content}
              annotate IncidentService.Incidents with @UI : {
                FieldGroup #DateData1 : {Data : [
                    { $Type : 'UI.DataField', Value : title, 
                      Criticality : priority.criticality,
                      CriticalityRepresentation : #WithIcon }
                  ]}
                };
            `;
            fsEditor.write(path, testData);
            const text = await testEdit(
                root,
                [],
                [
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: 'IncidentService.Incidents',
                            term: `com.sap.vocabularies.UI.v1.FieldGroup`,
                            qualifier: 'DateData1'
                        },
                        uri: project.files.annotations,
                        pointer: '/record/propertyValues/0/value/Collection/0/propertyValues/1'
                    },
                    {
                        kind: ChangeType.Delete,
                        reference: {
                            target: 'IncidentService.Incidents',
                            term: `com.sap.vocabularies.UI.v1.FieldGroup`,
                            qualifier: 'DateData1'
                        },
                        uri: project.files.annotations,
                        pointer: '/record/propertyValues/0/value/Collection/0/propertyValues/2'
                    }
                ],
                'IncidentService',
                fsEditor,
                false
            );

            expect(text).toMatchSnapshot();
        });
    });
});
