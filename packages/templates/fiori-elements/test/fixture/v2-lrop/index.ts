import { FEApp, FrameworkVersion, TemplateType, LROP } from '../../../src/data/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { OdataVersion } from '@sap/ux-odata-service-template';

export const v2LropTestData: FEApp<LROP> = { 
    app: {
        id: "test.new.gen.myApp",
        title: "My application"
    },
    package: {
        name: 'Test'
    },
    template: {
        type: TemplateType.ListReport,
        version: FrameworkVersion.V2,
        settings: {
            mainEntity: 'SEPMRA_C_PD_Product'
        }
    },
    service: {
        url: 'https://iccsrm.sap.com:44300',
        path: '/sap/opu/odata/sap/SEPMRA_PROD_MAN',
        version: OdataVersion.v2,
        metadata: readFileSync(join(__dirname, 'metadata.xml'), 'utf-8'),
        annotations: {
            technicalName: 'SEPMRA_PROD_MAN_ANNO_MDL',
            xml: readFileSync(join(__dirname, 'annotations.xml'), 'utf-8')
        }
    },
    annotations: {
        ns: 'test.new.gen'
    }
}