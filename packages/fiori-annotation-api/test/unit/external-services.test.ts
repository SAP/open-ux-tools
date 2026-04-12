import { join, relative } from 'node:path';
import { promises } from 'node:fs';

import { createElementNode, Range, Edm, Location } from '@sap-ux/odata-annotation-core-types';

import { readExternalServiceMetadata } from '../../src/external-services';
import { createFsEditorForProject } from './virtual-fs';
import type { Editor } from 'mem-fs-editor';
import { pathFromUri } from '../../src/utils/path';
import { PROJECTS } from './projects';
import { testRead } from './fiori-service.test';
import type { ValueListReference } from '../../src/types/adapter';
import { fileURLToPath } from 'node:url';
import { XMLAnnotationServiceAdapter } from '../../src/xml/adapter';
import * as avtDependency from '../../src/avt';
import type { FioriAnnotationService } from '../../src';

describe('external service loading', () => {
    test('placeholder test', async () => {
        const accessSpy = jest.spyOn(promises, 'access').mockResolvedValue(undefined);
        const readFileSpy = jest.spyOn(promises, 'readFile').mockResolvedValue('file');
        const data = await readExternalServiceMetadata(
            join(__dirname, 'localService', 'metadata.xml'),
            '/sap/opu/odata4/my/main/service/path',
            new Map([
                [
                    'TargetA',
                    [
                        {
                            location: Location.create('file:///main.xml', Range.create(0, 0, 0, 0)),
                            annotation: createElementNode({
                                name: Edm.Annotation
                            }),
                            uris: [
                                "../../../../srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer1.paymentcardtype'"
                            ],
                            namespace: 'test.namespace'
                        }
                    ]
                ],
                [
                    'tns.TargetB(Collection(tns.param1),tns.param2,Edm.String,  test.namespace.param3, param4,Collection(param5),Collection(Edm.String),Collection( test.namespace.param6))',
                    [
                        {
                            location: Location.create('file:///main.xml', Range.create(0, 0, 0, 0)),
                            annotation: createElementNode({
                                name: Edm.Annotation
                            }),
                            uris: [
                                "../../../../srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.paymentcardtype'"
                            ],
                            namespace: 'test.namespace',
                            alias: 'tns'
                        }
                    ]
                ],
                [
                    'tns.TargetC()',
                    [
                        {
                            location: Location.create('file:///main.xml', Range.create(0, 0, 0, 0)),
                            annotation: createElementNode({
                                name: Edm.Annotation
                            }),
                            uris: [
                                "../../../../srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer3.paymentcardtype'"
                            ],
                            namespace: 'test.namespace',
                            alias: 'tns'
                        }
                    ]
                ]
            ])
        );
        data.forEach((value) => {
            let relativePath = relative(__dirname, value.localFilePath);
            relativePath = relativePath.split('\\').join('/');
            value.localFilePath = relativePath;
        });
        expect(data).toMatchInlineSnapshot(`
            Map {
              "../../../../srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer1.paymentcardtype'" => Object {
                "data": "file",
                "localFilePath": "localService/srvd_f4/sap/p_paymentcardtypevaluehelp/0001/TargetA/metadata.xml",
              },
              "../../../../srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.paymentcardtype'" => Object {
                "data": "file",
                "localFilePath": "localService/srvd_f4/sap/p_paymentcardtypevaluehelp/0001/TargetB(Collection(test.namespace.param1),test.namespace.param2,Edm.String,  test.namespace.param3,param4,Collection(param5),Collection(Edm.String),Collection( test.namespace.param6))/metadata.xml",
              },
              "../../../../srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer3.paymentcardtype'" => Object {
                "data": "file",
                "localFilePath": "localService/srvd_f4/sap/p_paymentcardtypevaluehelp/0001/TargetC()/metadata.xml",
              },
            }
        `);
        expect(readFileSpy).toHaveBeenNthCalledWith(
            1,
            join(
                __dirname,
                'localService',
                'srvd_f4',
                'sap',
                'p_paymentcardtypevaluehelp',
                '0001',
                'TargetA',
                'metadata.xml'
            ),
            'utf-8'
        );
        expect(readFileSpy).toHaveBeenNthCalledWith(
            2,
            join(
                __dirname,
                'localService',
                'srvd_f4',
                'sap',
                'p_paymentcardtypevaluehelp',
                '0001',
                'TargetB(Collection(test.namespace.param1),test.namespace.param2,Edm.String,  test.namespace.param3,param4,Collection(param5),Collection(Edm.String),Collection( test.namespace.param6))',
                'metadata.xml'
            ),
            'utf-8'
        );
        readFileSpy.mockRestore();
        accessSpy.mockRestore();
    });

    describe('external service references and synchronization', () => {
        let service: FioriAnnotationService;

        beforeEach(async () => {
            const project = PROJECTS.V4_XML_START;
            const root = project.root;
            const fsEditor: Editor = await createFsEditorForProject(root);
            let path = pathFromUri(project.files.annotations);
            let content = fsEditor.read(path);
            let testData = `${content.replace(
                '</Schema>',
                `
                <Annotations Target="IncidentService.Incidents/priority_code">
                    <Annotation Term="Common.ValueListReferences">
                        <Collection>
                            <String>../../../../srvd_f4/dmo/i_priority/0001;ps='srvd-*dmo*sd_incidents_mdsk-0001';va='com.sap.gateway.srvd.dmo.sd_incidents_mdsk.v0001.et-*dmo*c_incidents_mdsk.priority'/$metadata</String>
                        </Collection>
                    </Annotation>
                </Annotations>
            </Schema>`
            )}
        `;
            fsEditor.write(path, testData);

            path = pathFromUri(project.files.metadata);
            content = fsEditor.read(path);
            testData = `${content.replace(
                '</Schema>',
                `
                <Annotations Target="IncidentService.Incidents/category_code">
                    <Annotation Term="Common.ValueListReferences">
                        <Collection>
                            <String>../../../../srvd_f4/dmo/i_category/0001;ps='srvd-*dmo*sd_incidents_mdsk-0001';va='com.sap.gateway.srvd.dmo.sd_incidents_mdsk.v0001.et-*dmo*c_incidents_mdsk.category'/$metadata</String>
                        </Collection>
                    </Annotation>
                </Annotations>
            </Schema>`
            )}
        `;
            fsEditor.write(path, testData);

            service = await testRead(PROJECTS.V4_XML_START.root, [], undefined, fsEditor);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('external service references', async () => {
            const result = service.getExternalServices() as Map<string, ValueListReference[]>;
            result.forEach((entry) => {
                entry.forEach((valueListReference) => {
                    valueListReference.location.uri = relative(
                        __dirname,
                        fileURLToPath(valueListReference.location.uri)
                    )
                        .split('\\')
                        .join('/');
                });
            });
            expect(service.getExternalServices()).toMatchSnapshot();
        });

        test('synchronize external services', async () => {
            const syncSpy = jest
                .spyOn(XMLAnnotationServiceAdapter.prototype, 'syncExternalService')
                .mockImplementation(() => {});
            service.syncExternalServices(
                new Map().set(
                    "../../../../srvd_f4/dmo/i_priority/0001;ps='srvd-*dmo*sd_incidents_mdsk-0001';va='com.sap.gateway.srvd.dmo.sd_incidents_mdsk.v0001.et-*dmo*c_incidents_mdsk.priority'/$metadata",
                    {
                        data: 'dummyData',
                        localFilePath: 'testFile'
                    }
                )
            );
            expect(syncSpy).toHaveBeenCalledWith(
                "../../../../srvd_f4/dmo/i_priority/0001;ps='srvd-*dmo*sd_incidents_mdsk-0001';va='com.sap.gateway.srvd.dmo.sd_incidents_mdsk.v0001.et-*dmo*c_incidents_mdsk.priority'/$metadata",
                'dummyData',
                'testFile'
            );
        });

        test('get external services schema', async () => {
            jest.spyOn(XMLAnnotationServiceAdapter.prototype, 'getExternalServices').mockReturnValue([
                {
                    compiledService: {
                        annotationFiles: [
                            {
                                uri: 'file:///dummyUri',
                                type: 'annotation-file',
                                references: [],
                                targets: [
                                    {
                                        name: 'dummyTarget',
                                        terms: [],
                                        type: 'target'
                                    }
                                ]
                            }
                        ],
                        odataVersion: '4.0',
                        metadata: []
                    },
                    localFileUri: 'dummyLocalFileUri',
                    metadataService: service.getMetadataService(),
                    uri: 'dummyUri'
                }
            ]);

            jest.spyOn(avtDependency, 'convertMetadataToAvtSchema').mockReturnValue({
                annotations: {},
                name: 'dummyAvtSchema'
            } as any);

            const mdUseSpy = jest.spyOn(service.getMetadataService(), 'useService');

            const schema = service.getExternalServiceSchema();
            expect(schema).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "identification": "metadataFile",
                    "localFileUri": "dummyLocalFileUri",
                    "references": Array [],
                    "schema": Object {
                      "annotations": Object {
                        "file:///dummyUri": Array [
                          Object {
                            "annotations": Array [],
                            "origins": Array [],
                            "target": "dummyTarget",
                          },
                        ],
                      },
                      "name": "dummyAvtSchema",
                    },
                    "version": "4.0",
                  },
                ]
            `);

            expect(mdUseSpy).toHaveBeenCalledWith('dummyUri');
        });
    });
});
