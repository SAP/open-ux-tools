import { FreestyleApp, generate } from '../src'; 
import { join } from 'path';
import { TemplateType, WorklistSettings } from '../src/data';
import { OdataService, OdataVersion } from '@sap/ux-odata-service-template';

const testDir = join(__dirname, 'tmp', Date.now().toString());
const fileList = [
    join(testDir, 'webapp', 'index.html'),
    join(testDir, 'webapp', 'Component.js'),
    join(testDir, 'webapp', 'view', 'View1.xml')
];

const commonConfig = {
    app: {
        id: 'test.me',
        title: 'My Test App'
    },
    package: {
        name: 'test.me'
    }
};

const northwind: OdataService = {
    url: 'https://services.odata.org',
    path: '/V2/Northwind/Northwind.svc',
    version: OdataVersion.v2
};

const basic: FreestyleApp<any> = {
    ... commonConfig,
    template: {
        type: TemplateType.Basic,
        settings: {}
    }
};

const worklist: FreestyleApp<WorklistSettings> = {
    ... commonConfig,
    service: northwind,
    template: {
        type: TemplateType.Worklist,
        settings: {
            entity: {
                name: 'Products',
                key: 'ProductID',
                idProperty: 'ProductName',
                numberProperty: 'UnitsInStock',
                unitOfMeasureProperty: 'QuantityPerUnit'
            }
        }
    }
};

[
    basic,
    worklist
].forEach(config => {
    generate(join(testDir, config.template.type), config).then((fs) => {
        fileList.forEach(file => {
            console.log(`${file}: ${fs.exists(file)}`);
        });
        fs.commit(()=> {
            console.log("Project generated");
        });
    });
});