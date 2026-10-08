/**
 * Test constants and project configurations
 *
 * OPEN SOURCE VERSION - Contains only generic mock data
 * No internal SAP systems, destinations, or infrastructure
 */

export interface MigrationTestProjectInfo {
    subDir: string;
    projectRoot?: string;
    baseUri: string;
    destination?: string;
    sapClient?: string;
    scp?: boolean;
}

export interface TestProjectInfo {
    [key: string]: {
        MIGRATION: MigrationTestProjectInfo;
    };
}

/**
 * Test project configurations with sanitized mock data
 * Safe for open-source repository
 */
export const PROJECTS: TestProjectInfo = {
    'sample.lrop.project': {
        MIGRATION: {
            subDir: 'sample_lrop_project',
            baseUri: 'https://backend.example.com'
        }
    },
    'sample.ovp.project': {
        MIGRATION: {
            subDir: 'sample_ovp_project',
            baseUri: 'https://backend.example.com'
        }
    },
    'sample.worklist.project': {
        MIGRATION: {
            subDir: 'sample_worklist_project',
            baseUri: 'https://backend.example.com',
            destination: 'BACKEND_SYSTEM'
        }
    },
    'sample.display.project': {
        MIGRATION: {
            subDir: 'sample_display_project',
            baseUri: 'https://backend.example.com',
            destination: 'BACKEND_SYSTEM'
        }
    },
    'sample.v4.lrop': {
        MIGRATION: {
            subDir: 'sample_v4_lrop',
            baseUri: 'http://localhost:8080',
            destination: 'LOCAL_BACKEND'
        }
    },
    'sample.freestyle.custom': {
        MIGRATION: {
            subDir: 'sample_freestyle_custom_webapp',
            baseUri: 'https://backend.example.com'
        }
    }
};

/**
 * Sample index.html content for tests
 */
export const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sample App</title>
    <script id="sap-ui-bootstrap"
        src="resources/sap-ui-core.js"
        data-sap-ui-theme="sap_fiori_3"
        data-sap-ui-libs="sap.m"
        data-sap-ui-compatVersion="edge"
        data-sap-ui-async="true"
        data-sap-ui-resourceroots='{"sample.app": "./"}'>
    </script>
    <script>
        sap.ui.getCore().attachInit(function() {
            sap.ui.require(["sample/app/Component"], function(Component) {
                new sap.m.Shell({
                    app: new sap.ui.core.ComponentContainer({
                        height: "100%",
                        name: "sample.app"
                    })
                }).placeAt("content");
            });
        });
    </script>
</head>
<body class="sapUiBody" id="content">
</body>
</html>`;

/**
 * Invalid neoapp.json for negative tests
 */
export const invalidNeoAppJson = `{
    "routes": [
        {
            "path": "/resources",
            "target": {
                "type": "service",
                "name": "sapui5",
                "entryPath": "/resources"
            },
            "description": "SAPUI5 Resources"
        }
    // Missing closing bracket
}`;

/**
 * Invalid project.json for negative tests
 */
export const invalidProjectJson = `{
    "generation": [
        {
            "templateId": "ui5template.basicSAPUI5ApplicationProject",
            "templateVersion": "1.32.0",
            "dateTimeStamp": "Thu, 01 Jan 2020 12:00:00 GMT"
        }
    ],
    "basevalidator": {
        "validator": "fioriV // Missing closing
}`;
