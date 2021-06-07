import { OdataService, OdataVersion } from '../src/data/types';
import { generate } from '../src'; 
import { join } from 'path';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

const testDir = 'sfdsf';
const fileList = [
    join(testDir, 'ui5.yaml'),
    join(testDir, 'package.json'),
    join(testDir, 'webapp', 'manifest.json'),
    join(testDir, 'webapp', 'localService', 'metadata.xml'),
    join(testDir, 'ui5-local.yaml')
];

const fs = create(createStorage());
fs.write(join(testDir, 'ui5.yaml'), '#empty file');
fs.writeJSON(join(testDir, 'package.json'), { ui5: { dependencies: []}});
fs.write(join(testDir, 'webapp', 'manifest.json'), '{}');

generate(testDir, {
    url: 'http://localhost',
    path: '/sap/odata/testme',
    version: OdataVersion.v2,
    metadata: '<HELLO WORLD />',
    annotations: {
        technicalName: 'SEPM_XYZ'
    }
} as OdataService, fs).then((fs) => {
    fileList.forEach(file => {
        console.log(fs.read(file));
    });
});