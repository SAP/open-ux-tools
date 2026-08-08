/**
 * Helper functions for generating package.json configuration during migration
 */

import { join } from 'node:path';
import { fileExists } from '../utils/index.js';
import { TemplateFileName } from '../index.js';
import { FioriElementsVersion } from '../project-spec-types.js';
import { propertyEditorTaskProjectTypes, isGenerateIndex } from '../utils/common.js';
import { determineSapUxLayer } from '../utils/migration-utils.js';
import { MigrationTypes } from '../utils/constants.js';
import { ODataVersion } from '../types.js';
import type {
    PackageJsonMigrate,
    ImportProjectInfo,
    PackageJsonContext,
    FLPConfiguration,
    PackageJsonFeatureFlags
} from '../types.js';

interface TestFile {
    type: string;
    path: string;
}

const TEST_FILES: TestFile[] = [
    { type: 'suite', path: 'test/testsuite.qunit.html' },
    { type: 'suite', path: 'test/qunit.runner.testsuite.html' },
    { type: 'unit', path: 'test/qunit/testsuite.unit.html' },
    { type: 'unit', path: 'test/unit/unitTests.qunit.html' },
    { type: 'unit', path: 'test/unitTests.qunit.html' },
    { type: 'int', path: 'test/integration/opaTests.qunit.html' },
    { type: 'int', path: 'test/opa5/opa5Tests.qunit.html' },
    { type: 'int', path: 'test/opaTests.qunit.html' }
];

/**
 * Generate package.json configuration for migration
 *
 * @param context - Configuration context containing all necessary parameters
 * @returns Package.json configuration object
 */
export async function generatePackageJsonConfig(context: PackageJsonContext): Promise<PackageJsonMigrate> {
    const { projectInfo, moduleName, moduleDescription, sapClient, dependencies, flpConfig, flags } = context;
    const { devDependencies, ui5Dependencies, v4MockServerDep } = dependencies;
    const { semanticObject, appIntent, appMockIntent, testFlpSandboxHtml, urlParam } = flpConfig;
    const { isSAPApp, internalToggle, hasDataSource, floorPlan, odataVersion } = flags;

    const runTasks: Array<{ name: string; command: string }> = [];

    // Add mock server task if data source exists
    if (hasDataSource && odataVersion) {
        const mockCmd: Record<string, string> = {
            [ODataVersion.v2]: `--open \\"test/flpSandboxMockServer.html${urlParam}${appMockIntent}\\"`,
            [ODataVersion.v4]: `--config ./ui5-mock.yaml --open \\"${testFlpSandboxHtml}${urlParam}${appIntent}\\"`
        };
        runTasks.push({
            name: 'start-mock',
            command: `fiori run ${mockCmd[odataVersion]}`
        });
    }

    // Add control property editor task if applicable
    if (internalToggle && floorPlan && propertyEditorTaskProjectTypes.includes(floorPlan) && !isSAPApp) {
        runTasks.push({
            name: 'start-control-property-editor',
            command: `fiori run --open 'editor.html'`
        });
    }

    // Check for test files and add corresponding scripts
    for (const testFile of TEST_FILES) {
        const scriptName = `${testFile.type}-tests`;
        if (
            (await fileExists(join(projectInfo.rootPath, projectInfo.webappPath, testFile.path))) &&
            runTasks.filter((runTask) => runTask.name === scriptName).length === 0
        ) {
            runTasks.push({
                name: scriptName,
                command: `fiori run --open \\"${testFile.path}\\"`
            });
        }
    }

    // Clone UI5 dependencies and add V4 mock server if needed
    const ui5DepsCloned = [...ui5Dependencies];
    if (odataVersion === ODataVersion.v4) {
        Object.assign(devDependencies, v4MockServerDep);
        ui5DepsCloned.push(Object.keys(v4MockServerDep)[0]);
    }

    // Generate start commands
    const { startCommand, startLocalCommand, startNoFlpCommand, startVariantsCommand } = generateStartCommands(
        projectInfo,
        flpConfig,
        flags
    );

    return {
        name: moduleName.toLowerCase(),
        description: moduleDescription,
        startCommand,
        startLocalCommand,
        startNoFlpCommand,
        startVariantsCommand,
        sapClientParam: sapClient,
        flpAppId: semanticObject,
        devDependencies: devDependencies,
        ui5Dependencies: ui5DepsCloned,
        sapux: !isSAPApp,
        sapuxLayer: determineSapUxLayer(internalToggle),
        enableEslint: false,
        runTasks,
        pointToIndexHtml: false,
        hasDataSource
    };
}

/**
 * Generate start commands for package.json scripts
 *
 * @param projectInfo - Project information
 * @param flpConfig - FLP configuration containing intent and URL parameters
 * @param flags - Feature flags
 * @returns Object containing all start command variants
 */
function generateStartCommands(
    projectInfo: ImportProjectInfo,
    flpConfig: FLPConfiguration,
    flags: PackageJsonFeatureFlags
): {
    startCommand: string | undefined;
    startLocalCommand: string | undefined;
    startNoFlpCommand: string | undefined;
    startVariantsCommand: string | undefined;
} {
    const { appIntent, appMockIntent, flpSandboxAvailable, testFlpSandboxHtml, urlParam, variantCmdUrlParam } =
        flpConfig;
    const { isSAPApp, hasDataSource, keepIndex, internalToggle } = flags;

    const previewAppAnchor = '#preview-app';

    // Determine local start command
    let startLocalCommand: string | undefined;
    if ((projectInfo.FEVersion === FioriElementsVersion.v2 || isSAPApp) && hasDataSource) {
        startLocalCommand = 'test/flpSandboxMockServer.html';
    } else {
        startLocalCommand = flpSandboxAvailable ? testFlpSandboxHtml : TemplateFileName.IndexHtml;
    }

    // Build commands
    let startVariantsCommand: string | undefined =
        `fiori run --open \\"preview.html${variantCmdUrlParam}${previewAppAnchor}\\"`;
    let startCommand: string | undefined = `fiori run --open \\"${
        flpSandboxAvailable ? testFlpSandboxHtml : TemplateFileName.IndexHtml
    }${urlParam}${appIntent}\\"`;
    let startNoFlpCommand: string | undefined = '';

    if (isGenerateIndex(projectInfo, internalToggle)) {
        startNoFlpCommand = `fiori run --open \\"${
            keepIndex ? 'index_new.html' : TemplateFileName.IndexHtml
        }${urlParam}\\"`;
    }

    startLocalCommand = `fiori run --config ./ui5-local.yaml --open \\"${startLocalCommand}${urlParam}${
        projectInfo.FEVersion === FioriElementsVersion.v4 ? appIntent : appMockIntent
    }\\"`;

    // Extension projects have different start commands
    if (projectInfo.type === MigrationTypes.projectExtension) {
        startCommand = `fiori run --open \\"${TemplateFileName.IndexHtml}${urlParam}${appIntent}\\"`;
        startNoFlpCommand = undefined;
        startLocalCommand = undefined;
        startVariantsCommand = undefined;
    }

    return { startCommand, startLocalCommand, startNoFlpCommand, startVariantsCommand };
}
