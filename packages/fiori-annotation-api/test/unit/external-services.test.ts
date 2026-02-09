import { join, relative } from 'node:path';
import { promises } from 'node:fs';

import { createElementNode, Range, Edm, Location } from '@sap-ux/odata-annotation-core-types';

import { readExternalServiceMetadata } from '../../src/external-services';
import { createFsEditorForProject } from './virtual-fs';
import type { Editor } from 'mem-fs-editor';
import { pathFromUri } from '../../src/utils/path';
import { PROJECTS } from './projects';
import { testRead } from './fiori-service.test';
import { ValueListReference } from '../../src/types/adapter';
import { fileURLToPath } from 'node:url';

describe('external service loading', () => {
    test('placeholder test', async () => {
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
                                "../../../../srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.paymentcardtype'"
                            ]
                        }
                    ]
                ]
            ])
        );
        expect(data).toMatchInlineSnapshot(`
            Map {
              "../../../../srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.paymentcardtype'" => Object {
                "data": "file",
                "localFilePath": "C:\\\\SAPDevelop\\\\UXTools\\\\OpenUXTools\\\\open-ux-tools\\\\packages\\\\fiori-annotation-api\\\\test\\\\unit\\\\localService\\\\srvd_f4\\\\sap\\\\p_paymentcardtypevaluehelp\\\\0001\\\\TargetA\\\\metadata.xml",
              },
            }
        `);
        expect(readFileSpy).toHaveBeenCalledWith(
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
        readFileSpy.mockRestore();
    });

    test('external service references', async () => {
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

        const service = await testRead(PROJECTS.V4_XML_START.root, [], undefined, fsEditor);
        const result = service.getExternalServices() as Map<string, ValueListReference[]>;
        result.forEach((entry) => {
            entry.forEach((valueListReference) => {
                valueListReference.location.uri = relative(__dirname, fileURLToPath(valueListReference.location.uri));
            });
        });
        expect(service.getExternalServices()).toMatchSnapshot();
    });
});
