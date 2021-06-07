import { Ui5App } from '../src/data';
import { generate } from '../src'; 
import { join } from 'path';

const testDir = 'sfdsf';

generate(testDir, { 
    app: {
        id: "myApp",
        title: "My application"
    },
    package: {
        name: 'Test'
    }
} as Ui5App).then((fs) => {
    console.log(fs.readJSON(join(testDir, 'package.json')));
    console.log(fs.read(join(testDir, 'webapp', 'i18n', 'i18n.properties')));
    console.log(fs.read(join(testDir, 'webapp', 'i18n', 'i18n_en.properties')));
    console.log(fs.read(join(testDir, 'webapp', 'index.html')));
    console.log(fs.read(join(testDir, 'webapp', 'Component.js')));
});