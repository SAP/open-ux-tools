import { join } from 'node:path';
import { promises } from 'node:fs';

import { createElementNode, Range, Edm, Location } from '@sap-ux/odata-annotation-core-types';

import { readExternalServiceMetadata } from '../../src/external-services';

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
              "../../../../srvd_f4/sap/p_paymentcardtypevaluehelp/0001;ps='srvd-zrc_arcustomer_definition-0001';va='com.sap.gateway.srvd.zrc_arcustomer_definition.v0001.et-z_arcustomer2.paymentcardtype'" => "file",
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
    });
});
