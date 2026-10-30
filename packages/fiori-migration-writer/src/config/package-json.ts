/**
 * Helper functions for generating package.json configuration during migration
 */

import { join } from 'node:path';
import type { MemFsEditor } from 'mem-fs-editor';
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
 * @param fs - mem-fs editor
 * @param context - Configuration context containing all necessary parameters
 * @returns Package.json configuration object
 */
export async function generatePackageJsonConfig(
    fs: MemFsEditor,
    context: PackageJsonContext
): Promise<PackageJsonMigrate> {
    const { projectInfo, moduleName, moduleDescription, sapClient, dependencies, flpConfig, flags } = context;
    const { devDependencies, ui5Dependencies, v4MockServerDep } = dependencies;
    const { semanticObject, appIntent, appMockIntent, testFlpSandboxHtml, urlParam } = flpConfig;
    const { isSAPApp, internalToggle, hasDataSource, floorPlan, odataVersion } = flags;

    const runTasks: Array<{ name: string; command: string }> = [];

    // Add mock server task if data source exists
    if (hasDataSource && odataVersion) {
        const mockCmd: Record<string, string> = {
            [ODataVersion.v2]: String.raw`--open \"test/flpSandboxMockServer.html${urlParam}${appMockIntent}\"`,
            [ODataVersion.v4]: String.raw`--config ./ui5-mock.yaml --open \"${testFlpSandboxHtml}${urlParam}${appIntent}\"`
        };
        runTasks.push({
            name: 'start-mock',
            command: `fiori run ${mockCmd[odataVersion]}`
        });
    }

    // Add control property editor task if applicable
    if (internalToggle && floorPlan && (propertyEditorTaskProjectTypes as string[]).includes(floorPlan) && !isSAPApp) {
        runTasks.push({
            name: 'start-control-property-editor',
            command: `fiori run --open 'editor.html'`
        });
    }

    // Check for test files and add corresponding scripts
    const testScriptResults = await Promise.all(
        TEST_FILES.map(async (testFile) => {
            const scriptName = `${testFile.type}-tests`;
            const exists = await fileExists(fs, join(projectInfo.rootPath, projectInfo.webappPath, testFile.path));

            if (exists) {
                return {
                    name: scriptName,
                    command: String.raw`fiori run --open \"${testFile.path}\"`
                };
            }
            return null;
        })
    );

    // Add non-null test scripts to runTasks, deduplicating by script name (first match wins)
    const seenScriptNames = new Set(runTasks.map((t) => t.name));
    for (const script of testScriptResults) {
        if (script !== null && !seenScriptNames.has(script.name)) {
            runTasks.push(script);
            seenScriptNames.add(script.name);
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
        String.raw`fiori run --open \"preview.html${variantCmdUrlParam}${previewAppAnchor}\"`;
    let startCommand: string | undefined = String.raw`fiori run --open \"${
        flpSandboxAvailable ? testFlpSandboxHtml : TemplateFileName.IndexHtml
    }${urlParam}${appIntent}\"`;
    let startNoFlpCommand: string | undefined = '';

    if (isGenerateIndex(projectInfo, internalToggle)) {
        startNoFlpCommand = String.raw`fiori run --open \"${
            keepIndex ? 'index_new.html' : TemplateFileName.IndexHtml
        }${urlParam}\"`;
    }

    startLocalCommand = String.raw`fiori run --config ./ui5-local.yaml --open \"${startLocalCommand}${urlParam}${
        projectInfo.FEVersion === FioriElementsVersion.v4 ? appIntent : appMockIntent
    }\"`;

    // Extension projects have different start commands
    if (projectInfo.type === MigrationTypes.projectExtension) {
        startCommand = String.raw`fiori run --open \"${TemplateFileName.IndexHtml}${urlParam}${appIntent}\"`;
        startNoFlpCommand = undefined;
        startLocalCommand = undefined;
        startVariantsCommand = undefined;
    }

    return { startCommand, startLocalCommand, startNoFlpCommand, startVariantsCommand };
}
