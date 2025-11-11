import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';

import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

import type { RawMetadata } from '@sap-ux/vocabularies-types';
import { parse } from '@sap-ux/edmx-parser';

import { getValueListReferences, writeValueListReferenceMetadata } from '../../src/data/value-list-references';
import { OdataVersion } from '../../src';

async function readEdmxFile(filePath: string): Promise<RawMetadata> {
    const text = await readFile(filePath, 'utf-8');
    return parse(text);
}

function getTestDataPath(relativePath: string): string {
    return join(__dirname, '../test-data/annotations-test', relativePath);
}

const SERVICE_PATH = '/sap/opu/odata4/sap/my_service/';

describe('getValueListReferences', () => {
    test('it should return empty array if no metadata is provided', () => {
        const result = getValueListReferences(SERVICE_PATH, undefined, []);
        expect(result).toEqual([]);
    });
    test('it should return empty array if there are no value list references', async () => {
        const metadata = await readEdmxFile(getTestDataPath('metadata.xml'));
        const result = getValueListReferences(SERVICE_PATH, metadata.schema, []);
        expect(result).toEqual([]);
    });
    test('it should return value list references', async () => {
        const metadata = await readEdmxFile(getTestDataPath('value_list_references_metadata.xml'));
        const result = getValueListReferences(SERVICE_PATH, metadata.schema, []);
        expect(result).toMatchSnapshot();
    });
    test('it should return value list references from annotation file', async () => {
        const metadata = await readEdmxFile(getTestDataPath('value_list_references_metadata.xml'));
        const annotations = await readFile(getTestDataPath('value_list_references_annotations.xml'), 'utf-8');
        const result = getValueListReferences(SERVICE_PATH, metadata.schema, [{ Definitions: annotations }]);
        expect(result).toMatchSnapshot();
    });
});

describe('writeValueListReferenceMetadata', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
    });

    test('it should not do anything if there are no references', async () => {
        const root = dirname(getTestDataPath('metadata.xml'));
        const spy = jest.spyOn(fs, 'write');
        writeValueListReferenceMetadata(root, [], { version: OdataVersion.v4 }, fs);
        expect(spy).toHaveBeenCalledTimes(0);
    });

    test('it should do nothing if there is no service path specified', async () => {
        const root = dirname(getTestDataPath('metadata.xml'));
        const spy = jest.spyOn(fs, 'write');
        writeValueListReferenceMetadata(
            root,
            [
                {
                    'path': '/sap/opu/odata4/sap/my_service/',
                    'target': 'CustomerType/DunningProcedure',
                    'data': '<metadata>'
                }
            ],
            { version: OdataVersion.v4 },
            fs
        );
        expect(spy).toHaveBeenCalledTimes(0);
    });

    test('it should default to "mainService" name', async () => {
        const root = dirname(getTestDataPath('metadata.xml'));
        const spy = jest.spyOn(fs, 'write');
        writeValueListReferenceMetadata(
            root,
            [
                {
                    path: "/sap/opu/odata4/sap/my_service/srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.paymentcardtype'",
                    target: 'CustomerType/DunningProcedure',
                    data: '<metadata>'
                }
            ],
            { path: SERVICE_PATH, version: OdataVersion.v4 },
            fs
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

    test('it should user service name', async () => {
        const root = dirname(getTestDataPath('metadata.xml'));
        const spy = jest.spyOn(fs, 'write');
        writeValueListReferenceMetadata(
            root,
            [
                {
                    path: "/sap/opu/odata4/sap/my_service/srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.paymentcardtype'",
                    target: 'CustomerType/DunningProcedure',
                    data: '<metadata>'
                }
            ],
            { path: SERVICE_PATH, name: 'myService', version: OdataVersion.v4 },
            fs
        );
        expect(spy).toHaveBeenCalledTimes(1);
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
                'CustomerType',
                'DunningProcedure',
                'metadata.xml'
            ),
            '<metadata>'
        );
    });
});
