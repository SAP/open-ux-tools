import { FEApp, FrameworkVersion, TemplateType, LROP } from '../../../src/data/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { OdataVersion } from '@sap/ux-odata-service-template';

export const v4LropTestData: FEApp<LROP> = { 
    app: {
        id: "test.new.gen.myV4App",
        title: "My V4 application"
    },
    package: {
        name: 'Test'
    },
    template: {
        type: TemplateType.ListReport,
        version: FrameworkVersion.V4,
        settings: {
            mainEntity: 'Travel'
        }
    },
    service: {
        version: OdataVersion.v4,
        url: 'https://ldai1er9.wdf.sap.corp:44300',
        path: '/sap/opu/odata4/dmo/ui_travel_uuid_um_v4/srvd/dmo/ui_travel_uuid_um/0001',
        metadata: readFileSync(join(__dirname, 'metadata.xml'), 'utf-8')
    },
    annotations: {
        ns: 'test.new.gen'
    }
}