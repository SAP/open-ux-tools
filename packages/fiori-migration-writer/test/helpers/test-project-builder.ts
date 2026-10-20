/**
 * Test project builder for creating mock projects
 */
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import type { Manifest } from '@sap-ux/project-access';

export interface TestProjectOptions {
    name: string;
    namespace: string;
    floorPlan?: 'ListReport' | 'AnalyticalListPage' | 'ObjectPage' | 'OverviewPage' | 'WorklistTemplate';
    ui5Version?: string;
    hasNeoApp?: boolean;
    hasProjectJson?: boolean;
    customWebappPath?: string;
    isExtension?: boolean;
    isAdaptation?: boolean;
    isLibrary?: boolean;
}

export class TestProjectBuilder {
    private rootPath: string;
    private options: TestProjectOptions;

    constructor(rootPath: string, options: TestProjectOptions) {
        this.rootPath = rootPath;
        this.options = options;
    }

    /**
     * Build a complete test project structure
     */
    build(): string {
        const projectPath = join(this.rootPath, this.options.name);

        // Clean if exists
        if (existsSync(projectPath)) {
            rmSync(projectPath, { recursive: true, force: true });
        }

        // Create structure
        mkdirSync(projectPath, { recursive: true });

        const webappPath = this.options.customWebappPath || 'webapp';
        const fullWebappPath = join(projectPath, webappPath);
        mkdirSync(fullWebappPath, { recursive: true });

        // Create manifest.json
        this.createManifest(fullWebappPath);

        // Create Component.js
        this.createComponent(fullWebappPath);

        // Create index.html for non-FE projects
        if (!this.options.floorPlan || this.options.isExtension) {
            this.createIndexHtml(fullWebappPath);
        }

        // Create neo-app.json if needed
        if (this.options.hasNeoApp) {
            this.createNeoApp(projectPath);
        }

        // Create .project.json if needed
        if (this.options.hasProjectJson) {
            this.createProjectJson(projectPath);
        }

        return projectPath;
    }

    private createManifest(webappPath: string): void {
        const manifest: Partial<Manifest> = {
            '_version': '1.12.0',
            'sap.app': {
                id: this.options.namespace,
                type: this.options.isLibrary ? 'library' : 'application',
                applicationVersion: {
                    version: '1.0.0'
                },
                title: this.options.name,
                dataSources: this.options.floorPlan
                    ? {
                          mainService: {
                              uri: '/sap/opu/odata/sap/SERVICE/',
                              type: 'OData',
                              settings: {
                                  odataVersion: '2.0'
                              }
                          }
                      }
                    : {}
            },
            'sap.ui': {
                technology: 'UI5',
                deviceTypes: {
                    desktop: true,
                    tablet: true,
                    phone: true
                }
            },
            'sap.ui5': {
                dependencies: {
                    minUI5Version: this.options.ui5Version || '1.96.0',
                    libs: {
                        'sap.ui.core': {},
                        'sap.m': {}
                    }
                },
                models: this.options.floorPlan
                    ? {
                          i18n: {
                              type: 'sap.ui.model.resource.ResourceModel',
                              settings: {
                                  bundleName: `${this.options.namespace}.i18n.i18n`
                              }
                          },
                          '': {
                              dataSource: 'mainService',
                              preload: true,
                              settings: {}
                          }
                      }
                    : {},
                routing: {
                    config: {},
                    routes: [],
                    targets: {}
                }
            }
        };

        // Add FE-specific sections
        if (this.options.floorPlan) {
            manifest['sap.ui.generic.app'] = {
                pages: [
                    {
                        entitySet: 'EntitySet',
                        component: {
                            name: 'sap.suite.ui.generic.template.ListReport'
                        }
                    }
                ]
            };
        }

        writeFileSync(join(webappPath, 'manifest.json'), JSON.stringify(manifest, null, 4));
    }

    private createComponent(webappPath: string): void {
        const componentJs = `sap.ui.define([
    "sap/ui/core/UIComponent"
], function (UIComponent) {
    "use strict";

    return UIComponent.extend("${this.options.namespace}.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
        }
    });
});`;

        writeFileSync(join(webappPath, 'Component.js'), componentJs);
    }

    private createIndexHtml(webappPath: string): void {
        const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${this.options.name}</title>
    <script id="sap-ui-bootstrap"
        src="resources/sap-ui-core.js"
        data-sap-ui-theme="sap_fiori_3"
        data-sap-ui-libs="sap.m"
        data-sap-ui-compatVersion="edge"
        data-sap-ui-async="true"
        data-sap-ui-resourceroots='{"${this.options.namespace}": "./"}'>
    </script>
    <script>
        sap.ui.getCore().attachInit(function() {
            sap.ui.require(["${this.options.namespace.replace(/\./g, '/')}/Component"], function(Component) {
                new sap.m.Shell({
                    app: new sap.ui.core.ComponentContainer({
                        height: "100%",
                        name: "${this.options.namespace}"
                    })
                }).placeAt("content");
            });
        });
    </script>
</head>
<body class="sapUiBody" id="content">
</body>
</html>`;

        writeFileSync(join(webappPath, 'index.html'), indexHtml);
    }

    private createNeoApp(projectPath: string): void {
        const neoapp = {
            welcomeFile: '/index.html',
            routes: [
                {
                    path: '/resources',
                    target: {
                        type: 'service',
                        name: 'sapui5',
                        entryPath: '/resources'
                    },
                    description: 'SAPUI5 Resources'
                },
                {
                    path: '/sap/opu/odata',
                    target: {
                        type: 'destination',
                        name: 'backend',
                        entryPath: '/sap/opu/odata'
                    },
                    description: 'Backend OData Service'
                }
            ]
        };

        writeFileSync(join(projectPath, 'neo-app.json'), JSON.stringify(neoapp, null, 4));
    }

    private createProjectJson(projectPath: string): void {
        const projectJson = {
            generation: [
                {
                    templateId: 'ui5template.basicSAPUI5ApplicationProject',
                    templateVersion: '1.40.12',
                    dateTimeStamp: new Date().toUTCString()
                }
            ],
            basevalidator: {
                validator: 'fioriV',
                viewvalidator: {
                    dataBinding: {
                        entitySets: []
                    }
                }
            }
        };

        writeFileSync(join(projectPath, '.project.json'), JSON.stringify(projectJson, null, 4));
    }

    /**
     * Quick builder for common project types
     */
    static buildLROP(rootPath: string, name: string = 'test-lrop'): string {
        return new TestProjectBuilder(rootPath, {
            name,
            namespace: 'test.lrop.app',
            floorPlan: 'ListReport',
            hasNeoApp: true,
            hasProjectJson: true
        }).build();
    }

    static buildOVP(rootPath: string, name: string = 'test-ovp'): string {
        return new TestProjectBuilder(rootPath, {
            name,
            namespace: 'test.ovp.app',
            floorPlan: 'OverviewPage',
            hasNeoApp: true,
            hasProjectJson: true
        }).build();
    }

    static buildFreestyle(rootPath: string, name: string = 'test-freestyle'): string {
        return new TestProjectBuilder(rootPath, {
            name,
            namespace: 'test.freestyle.app',
            hasNeoApp: true,
            hasProjectJson: true
        }).build();
    }

    static buildWorklist(rootPath: string, name: string = 'test-worklist'): string {
        return new TestProjectBuilder(rootPath, {
            name,
            namespace: 'test.worklist.app',
            floorPlan: 'WorklistTemplate',
            hasNeoApp: true,
            hasProjectJson: true
        }).build();
    }
}
