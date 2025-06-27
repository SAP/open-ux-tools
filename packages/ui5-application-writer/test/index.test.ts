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
            },
            projectType: 'EDMXBackend'
        },
        ui5: {
            framework: 'OpenUI5'
        },
        'package': {
            name: 'testPackageName'
        }
    } as Ui5App;

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
    });

    // Test to ensure the appid does not contain any characters that result in malfored docs
    it('validate appid', async () => {
        const projectDir = join(outputDir, 'testapp-fail');

        // Ensure double-quote cannot be used
        await expect(
            generate(projectDir, { ...ui5AppConfig, app: { id: 'test"AppId', projectType: 'EDMXBackend' } })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"The property: app.id contains disallowed characters: \\". Remove these characters and try again."`
        );

        // Ensure undefined, null or '' cannot be used
        await expect(
            generate(projectDir, { ...ui5AppConfig, app: { id: '', projectType: 'EDMXBackend' } })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"The property: app.id must have a value."`);
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

    it('Check webapp/index.html templates are generated correctly for CAP application with ui5 version ', async () => {
        const projectDir = join(outputDir, 'testapp-cap');
        ui5AppConfig.app.projectType = 'CAPNodejs';
        const fs = await generate(projectDir, { ...ui5AppConfig, ui5: { version: '1.96.1' } });
        const indexHtmlPath = join(projectDir, 'webapp/index.html');
        // Check if webapp/index.html exists
        expect(fs.exists(indexHtmlPath)).toBe(true);
        // Check if the index.html contains the correct UI5 framework URL with version included
        const indexHtml = fs.read(indexHtmlPath);
        expect(indexHtml).toContain('src="https://ui5.sap.com/1.96.1/resources/sap-ui-core.js"');
    });

    it('Check webapp/index.html templates are generated correctly for CAP application without ui5 version ', async () => {
        const projectDir = join(outputDir, 'testapp-cap');
        ui5AppConfig.app.projectType = 'CAPNodejs';
        const fs = await generate(projectDir, { ...ui5AppConfig });
        const indexHtmlPath = join(projectDir, 'webapp/index.html');
        // Check if webapp/index.html exists
        expect(fs.exists(indexHtmlPath)).toBe(true);
        // Check if the index.html contains the correct UI5 framework URL with version included
        const indexHtml = fs.read(indexHtmlPath);
        expect(indexHtml).toContain('src="https://sdk.openui5.org/resources/sap-ui-core.js"');
    });

    it('Check webapp/index.html templates are generated correctly for EDMX application', async () => {
        const projectDir = join(outputDir, 'testapp-cap');
        ui5AppConfig.app.projectType = 'EDMXBackend';
        const fs = await generate(projectDir, { ...ui5AppConfig, ui5: { version: '1.96.1' } });
        const indexHtmlPath = join(projectDir, 'webapp/index.html');
        // Check if webapp/index.html exists
        expect(fs.exists(indexHtmlPath)).toBe(true);
        // Check if the index.html contains the correct UI5 framework URL without version included
        const indexHtml = fs.read(indexHtmlPath);
        expect(indexHtml).toContain('src="resources/sap-ui-core.js"');
    });

    it('Check that no ui5-*.yamls files are correctly generated for CAP applications', async () => {
        const projectDir = join(outputDir, 'testapp-cap');
        ui5AppConfig.app.projectType = 'CAPNodejs';
        const fs = await generate(projectDir, {
            ...ui5AppConfig,
            ui5: { minUI5Version: '1.96.1' },
            appOptions: { ...ui5AppConfig.appOptions, useVirtualPreviewEndpoints: true }
        });
        // Check if ui5-local.yaml does not exist
        expect(fs.exists(join(projectDir, 'ui5-local.yaml'))).toBe(false);
        // Check if gitignore does not exist
        expect(fs.exists(join(projectDir, '.gitignore'))).toBe(false);
        // Check if ui5.yaml exist
        expect(fs.exists(join(projectDir, 'ui5.yaml'))).toBe(true);
        const ui5Yaml = fs.read(join(projectDir, 'ui5.yaml'));
        // Check if the ui5.yaml contains the fiori preview middleware
        expect(ui5Yaml).toContain('fiori-tools-preview');
        expect(ui5Yaml).toMatchInlineSnapshot(`
            "# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

            specVersion: \\"3.1\\"
            metadata:
              name: testAppId
            type: application
            server:
              customMiddleware:
                - name: fiori-tools-proxy
                  afterMiddleware: compression
                  configuration:
                    ignoreCertError: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
                    ui5:
                      path:
                        - /resources
                        - /test-resources
                      url: https://ui5.sap.com
                - name: fiori-tools-appreload
                  afterMiddleware: compression
                  configuration:
                    port: 35729
                    path: webapp
                    delay: 300
                - name: fiori-tools-preview
                  afterMiddleware: fiori-tools-appreload
                  configuration:
                    flp:
                      theme: sap_fiori_3
            "
        `);
    });
});
