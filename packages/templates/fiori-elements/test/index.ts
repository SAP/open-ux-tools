import { generate } from '../src'; 
import { v2LropTestData, v4LropTestData, v2OvpTestData } from './fixture';
import { join } from 'path';

const testDir = join(__dirname, 'tmp', Date.now().toString());
const fileList = [
    join(testDir, 'ui5.yaml'),
    join(testDir, 'package.json'),
    join(testDir, 'webapp', 'i18n', 'i18n.properties'),
    join(testDir, 'webapp', 'i18n', 'i18n_en.properties'),
    join(testDir, 'webapp', 'index.html'),
    join(testDir, 'webapp', 'Component.js'),
    join(testDir, 'webapp', 'annotations', 'annotation.xml')
];

generate(join(testDir, 'v2-lrop'), v2LropTestData).then((fs) => {
    fileList.forEach(file => {
        console.log(`${file}: ${fs.exists(file)}`);
    });
    fs.commit(()=> {
        console.log("Project generated");
    });
});

generate(join(testDir, 'v4-lrop'), v4LropTestData).then((fs) => {
    fileList.forEach(file => {
        console.log(`${file}: ${fs.exists(file)}`);
    });
    fs.commit(()=> {
        console.log("Project generated");
    });
});

generate(join(testDir, 'v2-ovp'), v2OvpTestData).then((fs) => {
    fileList.forEach(file => {
        console.log(`${file}: ${fs.exists(file)}`);
    });
    fs.commit(()=> {
        console.log("Project generated");
    });
}).catch((err) => {
    console.log(err);
});