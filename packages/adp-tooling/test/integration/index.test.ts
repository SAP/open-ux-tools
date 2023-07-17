import { join } from 'path';
import { generate } from '../../src';
import type { AdpWriterConfig } from '../../src/types';
import { rimraf } from 'rimraf';
import { config } from 'dotenv';
import type { Editor } from 'mem-fs-editor';
import { exec } from 'child_process';

jest.setTimeout(999999)

describe('ADP integration test', () => {
    const outputDir = join(__dirname, '../fixtures/test');

    beforeAll(async () => {
        await rimraf(outputDir);
    });

    describe('generate / install / preview', () => {
        config({ path: join(__dirname, '.env') });
        const writerConfig = {
            app: {
                id: process.env['ADP_APP_ID'],
                reference: process.env['ADP_APP_REFERENCE'],
                layer: process.env['ADP_APP_LAYER']
            },
            target: {
                url: process.env['ADP_TARGET_URL']
            }
        } as AdpWriterConfig;

        test('minimal config', async () => {
            // create the project
            const projectDir = join(outputDir, 'from-env');
            const fs = await generate(projectDir, writerConfig);
            amendProjectToUseUnreleasedVersion(projectDir, fs);
            await new Promise((resolve) => fs.commit(resolve));
            // run npm install
            await new Promise<void>((resolve) => {
                exec('npm i', { cwd: projectDir}, function callback(error, stdout, stderr) {
                    console.log(stdout);
                    resolve();
                  });
            });
            // run npm start
            await new Promise<void>((resolve) => {
                exec('npm start', { cwd: projectDir}, function callback(error, stdout, stderr) {
                    console.log(stdout);
                    resolve();
                  });
            });
        });
    });
});

function amendProjectToUseUnreleasedVersion(projectDir: string, fs: Editor) {
    // remove preview dependency from package.json
    const pckg = fs.readJSON(join(projectDir, 'package.json')) as { devDependencies: { [key: string]: string } };
    delete pckg.devDependencies['@sap-ux/preview-middleware'];
    fs.writeJSON(join(projectDir, 'package.json'), pckg);
    // ui5 module dependency pointing to the version in this repo
    const ui5 = fs.read(join(projectDir, 'ui5.yaml'));
    const ui5Extension = `---
specVersion: "3.0"
metadata:
    name: preview-middleware
kind: extension
type: server-middleware
middleware:
    path: ../../../../../preview-middleware/dist/ui5/middleware.js`;
    fs.write(
        join(projectDir, 'ui5.yaml'),
        ui5
            .replace('secure: true', 'secure: false')
            .replace('ignoreCertErrors: false', 'ignoreCertErrors: true') + ui5Extension
    );
}
