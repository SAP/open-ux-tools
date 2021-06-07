import { FEApp, FrameworkVersion, TemplateType, OVP } from '../../../src/data/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { OdataVersion } from '@sap/ux-odata-service-template';

export const v2OvpTestData: FEApp<OVP> = { 
    app: {
        id: "test.new.gen.myApp",
        title: "My application"
    },
    package: {
        name: 'Test'
    },
    template: {
        type: TemplateType.OverviewPage,
        version: FrameworkVersion.V2,
        settings: {
            filterEntity: 'GlobalFilters'
        }
    },
    service: {
        name: 'GWSAMPLE',
        model: 'GWSAMPLE',
        url: 'https://sap-ux-mock-services-v2-ovp.cfapps.us10.hana.ondemand.com',
        path: '/sap/opu/odata/sap/GWSAMPLE_BASIC',
        version: OdataVersion.v2,
        metadata: readFileSync(join(__dirname, 'metadata.xml'), 'utf-8'),
        annotations: {
            technicalName: 'GWSAMPLE_BASIC',
            xml: readFileSync(join(__dirname, 'annotations.xml'), 'utf-8')
        }
    },
    annotations: {
        ns: 'test.new.gen'
    }
}