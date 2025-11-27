import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';

import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

import type { RawMetadata } from '@sap-ux/vocabularies-types';
import { parse } from '@sap-ux/edmx-parser';

import { getExternalServiceReferences, writeExternalServiceMetadata } from '../../src/data/external-services';
import { OdataVersion } from '../../src';

async function readEdmxFile(filePath: string): Promise<RawMetadata> {
    const text = await readFile(filePath, 'utf-8');
    return parse(text);
}

function getTestDataPath(relativePath: string): string {
    return join(__dirname, '../test-data/annotations-test', relativePath);
}

const SERVICE_PATH = '/sap/opu/odata4/sap/my_service/';

describe('getExternalServiceReferences', () => {
    test('it should return empty array if no metadata is provided', () => {
        const result = getExternalServiceReferences(SERVICE_PATH, undefined, []);
        expect(result).toEqual([]);
    });
    test('it should return empty array if there are no external service references', async () => {
        const metadata = await readEdmxFile(getTestDataPath('metadata.xml'));
        const result = getExternalServiceReferences(SERVICE_PATH, metadata.schema, []);
        expect(result).toEqual([]);
    });
    test('it should return external service references', async () => {
        const metadata = await readEdmxFile(getTestDataPath('external_service_metadata.xml'));
        const result = getExternalServiceReferences(SERVICE_PATH, metadata.schema, []);
        expect(result).toMatchSnapshot();
    });
    test('it should return only value list references', async () => {
        const metadata = await readEdmxFile(getTestDataPath('external_service_metadata.xml'));
        const result = getExternalServiceReferences(SERVICE_PATH, metadata.schema, [], { codeLists: false });
        expect(result).toMatchSnapshot();
    });
    test('it should return only code list references', async () => {
        const metadata = await readEdmxFile(getTestDataPath('external_service_metadata.xml'));
        const result = getExternalServiceReferences(SERVICE_PATH, metadata.schema, [], { valueListReferences: false });
        expect(result).toMatchSnapshot();
    });
    test('it should return value external service references from annotation file', async () => {
        const metadata = await readEdmxFile(getTestDataPath('external_service_metadata.xml'));
        const annotations = await readFile(getTestDataPath('external_service_annotations.xml'), 'utf-8');
        const result = getExternalServiceReferences(SERVICE_PATH, metadata.schema, [{ Definitions: annotations }]);
        expect(result).toMatchSnapshot();
    });
});

describe('writeValueListReferenceMetadata', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
    });

    test('it should do nothing if there are no references', async () => {
        const root = dirname(getTestDataPath('metadata.xml'));
        const spy = jest.spyOn(fs, 'write');
        writeExternalServiceMetadata(fs, root, []);
        expect(spy).toHaveBeenCalledTimes(0);
    });

    test('it should do nothing if there is no service path specified', async () => {
        const root = dirname(getTestDataPath('metadata.xml'));
        const spy = jest.spyOn(fs, 'write');
        writeExternalServiceMetadata(fs, root, [
            {
                type: 'value-list',
                path: '/sap/opu/odata4/sap/my_service/',
                target: 'CustomerType/DunningProcedure',
                metadata: '<metadata>'
            }
        ]);
        expect(spy).toHaveBeenCalledTimes(0);
    });

    test('it should default to "mainService" name', async () => {
        const root = dirname(getTestDataPath('metadata.xml'));
        const spy = jest.spyOn(fs, 'write');
        writeExternalServiceMetadata(
            fs,
            root,
            [
                {
                    type: 'value-list',
                    path: "/sap/opu/odata4/sap/my_service/srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.paymentcardtype'",
                    target: 'CustomerType/DunningProcedure',
                    metadata: '<metadata>'
                }
            ],
            undefined,
            SERVICE_PATH
        );
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenNthCalledWith(
            1,
            join(
                root,
                'localService',
                'mainService',
                'srvd_f4',
                'sap',
                'p_paymentcardtypevaluehelp',
                '0001',
                'CustomerType',
                'DunningProcedure',
                'metadata.xml'
            ),
            '<metadata>'
        );
    });

    test('it should use service name', async () => {
        const root = dirname(getTestDataPath('metadata.xml'));
        const spy = jest.spyOn(fs, 'write');
        writeExternalServiceMetadata(
            fs,
            root,
            [
                {
                    type: 'value-list',
                    path: "/sap/opu/odata4/sap/my_service/srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.paymentcardtype'",
                    target: 'CustomerType/DunningProcedure',
                    metadata: '<metadata>',
                    entityData: [
                        {
                            entitySetName: 'PaymentCard',
                            items: [{ Card: 'A' }, { Card: 'B' }]
                        }
                    ]
                }
            ],
            'myService',
            SERVICE_PATH
        );
        expect(spy).toHaveBeenCalledTimes(2);

        expect(spy).toHaveBeenNthCalledWith(
            1,
            join(
                root,
                'localService',
                'myService',
                'srvd_f4',
                'sap',
                'p_paymentcardtypevaluehelp',
                '0001',
                'PaymentCard.json'
            ),
            JSON.stringify([{ Card: 'A' }, { Card: 'B' }], undefined, 4)
        );
        expect(spy).toHaveBeenNthCalledWith(
            2,
            join(
                root,
                'localService',
                'myService',
                'srvd_f4',
                'sap',
                'p_paymentcardtypevaluehelp',
                '0001',
                'CustomerType',
                'DunningProcedure',
                'metadata.xml'
            ),
            '<metadata>'
        );
    });

    test('it should write service data only once', async () => {
        const root = dirname(getTestDataPath('metadata.xml'));
        const spy = jest.spyOn(fs, 'write');
        writeExternalServiceMetadata(
            fs,
            root,
            [
                {
                    type: 'value-list',
                    path: "/sap/opu/odata4/sap/my_service/srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.paymentcardtype'",
                    target: 'CustomerType/DunningProcedure',
                    metadata: '<metadata>',
                    entityData: [
                        {
                            entitySetName: 'PaymentCard',
                            items: [{ Card: 'A' }, { Card: 'B' }]
                        }
                    ]
                },
                {
                    type: 'value-list',
                    path: "/sap/opu/odata4/sap/my_service/srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.B'",
                    target: 'CustomerType/B',
                    metadata: '<metadata>',
                    entityData: [
                        {
                            entitySetName: 'PaymentCard',
                            items: [{ Card: 'A' }, { Card: 'B' }]
                        }
                    ]
                }
            ],
            'myService',
            SERVICE_PATH
        );
        expect(spy).toHaveBeenCalledTimes(3);

        expect(spy).toHaveBeenNthCalledWith(
            1,
            join(
                root,
                'localService',
                'myService',
                'srvd_f4',
                'sap',
                'p_paymentcardtypevaluehelp',
                '0001',
                'PaymentCard.json'
            ),
            JSON.stringify([{ Card: 'A' }, { Card: 'B' }], undefined, 4)
        );
        expect(spy).toHaveBeenNthCalledWith(
            2,
            join(
                root,
                'localService',
                'myService',
                'srvd_f4',
                'sap',
                'p_paymentcardtypevaluehelp',
                '0001',
                'CustomerType',
                'DunningProcedure',
                'metadata.xml'
            ),
            '<metadata>'
        );
    });

    test('it should use write code lists', async () => {
        const root = dirname(getTestDataPath('metadata.xml'));
        const spy = jest.spyOn(fs, 'write');
        writeExternalServiceMetadata(
            fs,
            root,
            [
                {
                    type: 'code-list',
                    path: '/sap/opu/odata4/sap/my_service/default/iwbep/common/0001',
                    metadata: '<metadata>',
                    entityData: [
                        {
                            entitySetName: 'CodeListSet',
                            items: [{ Code: 'A' }, { Code: 'B' }]
                        }
                    ]
                }
            ],
            'myService',
            SERVICE_PATH
        );
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenNthCalledWith(
            1,
            join(root, 'localService', 'myService', 'default', 'iwbep', 'common', '0001', 'CodeListSet.json'),
            JSON.stringify([{ Code: 'A' }, { Code: 'B' }], undefined, 4)
        );
        expect(spy).toHaveBeenNthCalledWith(
            2,
            join(root, 'localService', 'myService', 'default', 'iwbep', 'common', '0001', 'metadata.xml'),
            '<metadata>'
        );
    });
});
