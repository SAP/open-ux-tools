import { join } from 'path';
import { removeSync } from 'fs-extra';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Ui5App } from '../src';
import { generate, isTypescriptEnabled, enableTypescript } from '../src';
import { updatePackageJSONDependencyToUseLocalPath } from './common';

describe('UI5 templates', () => {
    const fs = create(createStorage());
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');

    beforeAll(() => {
        removeSync(outputDir); // even for in memory
    });

    afterAll(() => {
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });

    const ui5AppConfig = {
        app: {
            id: 'testAppId',
            title: 'Test App Title',
            description: 'Test App Description',
            sourceTemplate: {
                version: '1.2.3-test',
                id: '@sap/test-ui5-template-id'
            }
        },
        ui5: {
            framework: 'OpenUI5'
        },
        'package': {
            name: 'testPackageName'
        }
    } as Ui5App;

    const assertUi5YamlContainsMiddleware = (path: string) => {
        // check if middleware is written to ui5.yaml if no appOptions are provided
        const ui5File = fs.read(join(path, 'ui5.yaml'));
        // Check if the ui5File snapshot contains "customMiddleware"
        expect(ui5File).toMatch(/customMiddleware/);
        // Check if the ui5File snapshot contains "name: fiori-tools-proxy"
        expect(ui5File).toMatch(/name: fiori-tools-proxy/);
        // Check if the ui5File snapshot contains "name: fiori-tools-appreload"
        expect(ui5File).toMatch(/name: fiori-tools-appreload/);
    };

    it('generates files correctly', async () => {
        let projectDir = join(outputDir, 'testapp-simple');
        await generate(projectDir, ui5AppConfig, fs);
        expect(fs.dump(projectDir)).toMatchSnapshot();

        // Test `sap.app.sourceTemplate.toolsId` is correctly written
        ui5AppConfig.app.sourceTemplate = {
            ...ui5AppConfig.app.sourceTemplate,
            toolsId: 'guid:1234abcd'
        };
        projectDir = join(outputDir, 'testapp-withtoolsid');
        await generate(projectDir, ui5AppConfig, fs);
        await updatePackageJSONDependencyToUseLocalPath(projectDir, fs);
        expect((fs.readJSON(join(projectDir, '/webapp/manifest.json')) as any)['sap.app']['sourceTemplate'])
            .toMatchInlineSnapshot(`
            Object {
              "id": "@sap/test-ui5-template-id",
              "toolsId": "guid:1234abcd",
              "version": "1.2.3-test",
            }
        `);
        assertUi5YamlContainsMiddleware(projectDir);
    });

    it('generates files correctly with middleware configration written when excludeMiddleware option is true', async () => {
        let projectDir = join(outputDir, 'testapp-simple');
        await generate(projectDir, ui5AppConfig, fs);
        // ensure the middleware is written to the ui5.yaml if excludeMiddleware is set to true
        ui5AppConfig.appOptions = {
            excludeMiddleware: true
        };
        projectDir = join(outputDir, 'testapp-withtoolsid');
        await generate(projectDir, ui5AppConfig, fs);
        await updatePackageJSONDependencyToUseLocalPath(projectDir, fs);
        const ui5File = fs.read(join(projectDir, 'ui5.yaml'));
        expect(ui5File).toMatchInlineSnapshot(`
            "# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

            specVersion: \\"3.1\\"
            metadata:
              name: testAppId
            type: application
            "
        `);
    });

    it('generates files correctly with middleware configration written when excludeMiddleware option is false', async () => {
        let projectDir = join(outputDir, 'testapp-simple');
        await generate(projectDir, ui5AppConfig, fs);
        // ensure the middleware is written to the ui5.yaml if excludeMiddleware is set to true
        ui5AppConfig.appOptions = {
            excludeMiddleware: false
        };
        projectDir = join(outputDir, 'testapp-withtoolsid');
        await generate(projectDir, ui5AppConfig, fs);
        await updatePackageJSONDependencyToUseLocalPath(projectDir, fs);
        assertUi5YamlContainsMiddleware(projectDir);
    });

    // Test to ensure the appid does not contain any characters that result in malfored docs
    it('validate appid', async () => {
        const projectDir = join(outputDir, 'testapp-fail');

        // Ensure double-quote cannot be used
        await expect(
            generate(projectDir, { ...ui5AppConfig, app: { id: 'test"AppId' } })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"The property: app.id contains disallowed characters: \\""`);

        // Ensure undefined, null or '' cannot be used
        await expect(
            generate(projectDir, { ...ui5AppConfig, app: { id: '' } })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"The property: app.id must have a value"`);
    });

    it('generate and evolve to ts', async () => {
        // generic classic js project
        const projectDir = join(outputDir, 'testapp-tsenabled');
        await generate(projectDir, { ...ui5AppConfig, ui5: { minUI5Version: '1.96.1' } }, fs);
        expect(await isTypescriptEnabled(projectDir, fs)).toBe(false);
        // enable ts
        await enableTypescript(projectDir, fs);
        await updatePackageJSONDependencyToUseLocalPath(projectDir, fs);
        expect(await isTypescriptEnabled(projectDir, fs)).toBe(true);
    });

    it('try enabling ts on an invalid project', async () => {
        const projectDir = join(outputDir, 'testapp-invalid');
        await generate(projectDir, ui5AppConfig, fs);
        fs.delete(join(projectDir, 'ui5.yaml'));
        await expect(enableTypescript(projectDir, fs)).rejects.toThrowError();
        fs.write(join(projectDir, 'ui5.yaml'), '');
        fs.delete(join(projectDir, 'webapp/manifest.json'));
        await expect(enableTypescript(projectDir, fs)).rejects.toThrowError();
    });
});
