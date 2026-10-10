import { describe, it, expect, beforeAll } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { ProjectMigrator, initI18n } from '../../src/index.js';
import { loadProjectIntoMemFs } from '../helpers/mem-fs-helper.js';
import { DUMMY_BACKEND_URL, UI5_SNAPSHOT_URL } from '../test-constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Adaptation Project - Enhanced Coverage', () => {
    const testOutputDir = join(__dirname, '../test-output', 'adaptation-enhanced');

    beforeAll(async () => {
        await initI18n();
        if (existsSync(testOutputDir)) {
            rmSync(testOutputDir, { recursive: true, force: true });
        }
        mkdirSync(testOutputDir, { recursive: true });
    });

    it('should handle adaptation project with package.json having UI5 tooling', async () => {
        const testProjectPath = join(testOutputDir, 'adaptation-with-ui5-tooling');
        mkdirSync(join(testProjectPath, 'webapp'), { recursive: true });

        const variantManifest = {
            id: 'customer.extension',
            reference: 'base.app.id',
            layer: 'CUSTOMER_BASE'
        };
        writeFileSync(
            join(testProjectPath, 'webapp', 'manifest.appdescr_variant'),
            JSON.stringify(variantManifest, null, 2)
        );

        const packageJson = {
            name: 'adaptation-project',
            version: '1.0.0',
            devDependencies: {
                '@ui5/cli': '^2.0.0'
            },
            scripts: {
                build: 'ui5 build'
            }
        };
        writeFileSync(join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

        const fs = loadProjectIntoMemFs(testProjectPath);
        const { result } = await ProjectMigrator.migrate(
            testProjectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBeDefined();
    });

    it('should handle adaptation project without package.json (legacy WebIDE)', async () => {
        const testProjectPath = join(testOutputDir, 'adaptation-no-package');
        mkdirSync(join(testProjectPath, 'webapp'), { recursive: true });

        const variantManifest = {
            id: 'customer.extension',
            reference: 'base.app.id'
        };
        writeFileSync(
            join(testProjectPath, 'webapp', 'manifest.appdescr_variant'),
            JSON.stringify(variantManifest, null, 2)
        );

        // No package.json created intentionally

        const fs = loadProjectIntoMemFs(testProjectPath);
        const { result } = await ProjectMigrator.migrate(
            testProjectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBeDefined();
    });

    it('should handle adaptation project with neo-app.json destination', async () => {
        const testProjectPath = join(testOutputDir, 'adaptation-neoapp-dest');
        mkdirSync(join(testProjectPath, 'webapp'), { recursive: true });

        const variantManifest = {
            id: 'customer.extension',
            reference: 'base.app.id'
        };
        writeFileSync(
            join(testProjectPath, 'webapp', 'manifest.appdescr_variant'),
            JSON.stringify(variantManifest, null, 2)
        );

        const neoapp = {
            routes: [
                {
                    path: '/sap/opu/odata',
                    target: {
                        type: 'destination',
                        name: 'BACKEND_DEST',
                        entryPath: '/sap/opu/odata'
                    }
                }
            ]
        };
        writeFileSync(join(testProjectPath, 'neo-app.json'), JSON.stringify(neoapp, null, 2));

        const fs = loadProjectIntoMemFs(testProjectPath);
        const { result } = await ProjectMigrator.migrate(
            testProjectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBeDefined();
    });

    it('should detect adaptation project with manifest.appdescr_variant', async () => {
        const testProjectPath = join(testOutputDir, 'adaptation-variant');
        mkdirSync(join(testProjectPath, 'webapp'), { recursive: true });

        const variantManifest = {
            id: 'customer.extension',
            reference: 'base.app.id',
            layer: 'CUSTOMER_BASE',
            content: []
        };
        writeFileSync(
            join(testProjectPath, 'webapp', 'manifest.appdescr_variant'),
            JSON.stringify(variantManifest, null, 2)
        );

        const packageJson = {
            name: 'adaptation-project',
            version: '1.0.0',
            scripts: {}
        };
        writeFileSync(join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

        const fs = loadProjectIntoMemFs(testProjectPath);
        const { result, messages } = await ProjectMigrator.migrate(
            testProjectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBeDefined();
        const errors = messages.filter((m) => m.type === 'ERROR');
        expect(errors.length).toBeLessThan(5);
    });

    it('should handle adaptation project with .che/project.json', async () => {
        const testProjectPath = join(testOutputDir, 'adaptation-che');
        mkdirSync(join(testProjectPath, 'webapp'), { recursive: true });
        mkdirSync(join(testProjectPath, '.che'), { recursive: true });

        const projectJson = {
            type: 'com.watt.common.plugin.appvariants.project.type',
            attributes: {
                'sap.watt.common.plugin.appvariants.project.type': []
            }
        };
        writeFileSync(join(testProjectPath, '.che', 'project.json'), JSON.stringify(projectJson, null, 2));

        const variantManifest = {
            id: 'customer.extension',
            reference: 'base.app.id'
        };
        writeFileSync(
            join(testProjectPath, 'webapp', 'manifest.appdescr_variant'),
            JSON.stringify(variantManifest, null, 2)
        );

        const fs = loadProjectIntoMemFs(testProjectPath);
        const { result } = await ProjectMigrator.migrate(
            testProjectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBeDefined();
    });

    it('should detect adaptation project without .che folder', async () => {
        const testProjectPath = join(testOutputDir, 'adaptation-no-che');
        mkdirSync(join(testProjectPath, 'webapp'), { recursive: true });

        const variantManifest = {
            id: 'customer.extension',
            reference: 'base.app.id',
            layer: 'VENDOR'
        };
        writeFileSync(
            join(testProjectPath, 'webapp', 'manifest.appdescr_variant'),
            JSON.stringify(variantManifest, null, 2)
        );

        const fs = loadProjectIntoMemFs(testProjectPath);
        const { result } = await ProjectMigrator.migrate(
            testProjectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBeDefined();
    });

    it('should handle adaptation project with changes folder', async () => {
        const testProjectPath = join(testOutputDir, 'adaptation-changes');
        mkdirSync(join(testProjectPath, 'webapp', 'changes'), { recursive: true });

        const changeFile = {
            fileName: 'id_123_addField',
            fileType: 'change',
            changeType: 'addField',
            reference: 'base.app.Component',
            content: {}
        };
        writeFileSync(
            join(testProjectPath, 'webapp', 'changes', 'id_123_addField.change'),
            JSON.stringify(changeFile, null, 2)
        );

        const variantManifest = {
            id: 'customer.extension',
            reference: 'base.app.id'
        };
        writeFileSync(
            join(testProjectPath, 'webapp', 'manifest.appdescr_variant'),
            JSON.stringify(variantManifest, null, 2)
        );

        const fs = loadProjectIntoMemFs(testProjectPath);
        const { result } = await ProjectMigrator.migrate(
            testProjectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBeDefined();
    });
});

describe('Extension Project - Enhanced Coverage', () => {
    const testOutputDir = join(__dirname, '../test-output', 'extension-enhanced');

    beforeAll(async () => {
        await initI18n();
        if (existsSync(testOutputDir)) {
            rmSync(testOutputDir, { recursive: true, force: true });
        }
        mkdirSync(testOutputDir, { recursive: true });
    });

    it('should detect extension project with extension type in manifest', async () => {
        const testProjectPath = join(testOutputDir, 'extension-manifest');
        mkdirSync(join(testProjectPath, 'webapp'), { recursive: true });

        const manifest = {
            'sap.app': {
                id: 'customer.extension',
                type: 'application',
                embeds: [''],
                applicationVersion: {
                    version: '1.0.0'
                }
            },
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '1.96.0'
                },
                componentUsages: {
                    baseApp: {
                        name: 'base.app.id'
                    }
                }
            }
        };
        writeFileSync(join(testProjectPath, 'webapp', 'manifest.json'), JSON.stringify(manifest, null, 2));

        const component = `sap.ui.define([
    "base/app/id/Component"
], function(BaseComponent) {
    "use strict";
    return BaseComponent.extend("customer.extension.Component", {
        metadata: {
            manifest: "json"
        }
    });
});`;
        writeFileSync(join(testProjectPath, 'webapp', 'Component.js'), component);

        const fs = loadProjectIntoMemFs(testProjectPath);
        const { result } = await ProjectMigrator.migrate(
            testProjectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBeDefined();
    });

    it('should handle extension project with controller extensions', async () => {
        const testProjectPath = join(testOutputDir, 'extension-controllers');
        mkdirSync(join(testProjectPath, 'webapp', 'controller'), { recursive: true });

        const manifest = {
            'sap.app': {
                id: 'customer.extension',
                type: 'application'
            },
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '1.96.0'
                },
                extends: {
                    component: 'base.app.id',
                    minVersion: '1.0.0',
                    extensions: {
                        'sap.ui.controllerExtensions': {
                            'base.app.controller.Main': {
                                controllerName: 'customer.extension.controller.MainExtension'
                            }
                        }
                    }
                }
            }
        };
        writeFileSync(join(testProjectPath, 'webapp', 'manifest.json'), JSON.stringify(manifest, null, 2));

        const controllerExtension = `sap.ui.define([
], function() {
    "use strict";
    return {
        onInit: function() {
            // Extension logic
        }
    };
});`;
        writeFileSync(
            join(testProjectPath, 'webapp', 'controller', 'MainExtension.controller.js'),
            controllerExtension
        );

        const fs = loadProjectIntoMemFs(testProjectPath);
        const { result } = await ProjectMigrator.migrate(
            testProjectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBeDefined();
    });

    it('should handle extension project with view extensions', async () => {
        const testProjectPath = join(testOutputDir, 'extension-views');
        mkdirSync(join(testProjectPath, 'webapp', 'view'), { recursive: true });

        const manifest = {
            'sap.app': {
                id: 'customer.extension',
                type: 'application'
            },
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '1.96.0'
                },
                extends: {
                    component: 'base.app.id',
                    extensions: {
                        'sap.ui.viewExtensions': {
                            'base.app.view.Main': {
                                extensionPointName: {
                                    className: 'sap.ui.core.Fragment',
                                    fragmentName: 'customer.extension.view.MainExtension',
                                    type: 'XML'
                                }
                            }
                        }
                    }
                }
            }
        };
        writeFileSync(join(testProjectPath, 'webapp', 'manifest.json'), JSON.stringify(manifest, null, 2));

        const viewExtension = `<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core">
    <Button text="Extension Button" />
</core:FragmentDefinition>`;
        writeFileSync(join(testProjectPath, 'webapp', 'view', 'MainExtension.fragment.xml'), viewExtension);

        const fs = loadProjectIntoMemFs(testProjectPath);
        const { result } = await ProjectMigrator.migrate(
            testProjectPath,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBeDefined();
    });
});
