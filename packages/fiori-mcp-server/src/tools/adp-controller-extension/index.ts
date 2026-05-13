import type { ExecuteFunctionalityOutput, AdpControllerExtensionInput } from '../../types';
import { promises as FSpromises } from 'node:fs';
import { join, dirname, relative, isAbsolute, resolve, sep } from 'node:path';
import { logger } from '../../utils/logger';
import { ADP_CONTROLLER_EXTENSION_FUNCTIONALITY_ID } from '../../constant';
import {
    extractFilesFromResponse,
    isChangeFile,
    isAdaptationProject,
    readManifestVariant,
    getProjectFolderName,
    scanExistingProjectFiles,
    type ExistingProjectFile
} from './utils';

const KNOWLEDGE_BASE = `You are a SAPUI5 Adaptation Project expert specializing in controller extensions and xml fragments for adaptation projects.

IMPORTANT RULES:
1. For controller extensions, always use "sap/ui/core/mvc/ControllerExtension" (NOT "sap/ui/core/mvc/Controller"). Use ControllerExtension.extend() pattern for proper adaptation project architecture.
2. Assign stable, unique IDs to all controls, elements, subcontrols, items, and sub-items even when they have a key or other identifying attribute. This is crucial for adaptation project functionality.
3. When providing code, always provide the entire file! Do not omit parts or replace them with an ellipsis. Keep the rest of the file as-is in your reply, only touch the part that needs to be changed.
4. Immediately before each code block belonging to a file, with no other text in between, write the full path+name of the file in the following format: **Path:** fullFilePath. It is of extreme importance to always provide this format with the word 'Path' before the file path and no other content between this line and the code block.

ADAPTATION PROJECT DETECTION:
1. Check for the manifest.appdescr_variant file under the webapp folder
2. If present, this is an adaptation project context
3. CRITICAL: Read the "layer" property from manifest.appdescr_variant to determine if a customer prefix is needed:
   - If layer is "CUSTOMER_BASE": Use "customer" prefix in controller extension namespace and fragment event handlers
   - If layer is anything else: Do NOT use "customer" prefix
4. Read "id" property from manifest.appdescr_variant and use it as namespace for change files
5. Use the project root folder name (folder containing webapp) for controller extension namespaces
6. ALWAYS check the manifest.appdescr_variant file before generating code

CONTROLLER EXTENSION NAMESPACE PATTERN:
FRAGMENT FILES (XML) - Event Handler References:
- Standard layer: press=".extension.{project-folder-name}.{controller-extension-name}.{methodName}"
- CUSTOMER_BASE layer: press=".extension.customer.{project-folder-name}.{controller-extension-name}.{methodName}"
- Example (standard layer): press=".extension.myapp.ControllerExt.onPressAction"
- Example (CUSTOMER_BASE layer): press=".extension.customer.myapp.ControllerExt.onPressAction"
- The ".extension" prefix is ONLY used in fragment XML event handlers
- The "customer" prefix is ONLY added in fragment XML when layer is CUSTOMER_BASE
- The {project-folder-name} must be the adaptation project root folder name (the folder above webapp)

CONTROLLER EXTENSION FILES (JS/TS) - File Paths and Namespaces:
- File path: webapp/changes/coding/{controller-extension-name}.js (NO customer prefix in file path)
- Namespace in ControllerExtension.extend():
  * Standard layer: ControllerExtension.extend("{project-folder}.{ControllerExtName}", {...})
  * CUSTOMER_BASE layer: ControllerExtension.extend("customer.{project-folder}.{ControllerExtName}", {...})
- Example (standard): ControllerExtension.extend("adapt.blog.ControllerExt", {...})
- Example (CUSTOMER_BASE): ControllerExtension.extend("customer.adapt.blog.ControllerExt", {...})
- The "customer" prefix is added to the extend() namespace when layer is CUSTOMER_BASE
- Do NOT use ".extension" prefix in the controller extension namespace
- The controller file path does NOT include "customer" - only the namespace in the code does

ID & CONTROL HANDLING:
- CRITICAL: Do NOT add an id attribute to Dialog controls in controller extension files. Dialogs should be created without an id property.
- Preserve any provided hints (e.g., <!-- viewName: ... -->, <!-- controlType: ... -->, <!-- targetAggregation: ... -->).
- Do not remove original comments and align your changes with the given hints.
- Follow adaptation project naming conventions for IDs

FRAGMENT CONTROL WORKFLOW:
If the original fragment or change file contains comments such as <!-- targetAggregation: ... --> or <!-- controlType: ... -->, use these as hints for what kind of control or aggregation is expected.
IMPORTANT: The controlType comment refers to the PARENT control that will contain the fragment content.
- <!-- controlType --> indicates the type of the parent control (e.g., Toolbar, VBox, etc.)
- DO NOT add the controlType as a wrapper in your fragment - only provide the inner content
- Example: If controlType is "Toolbar", provide only the Button/content, not another Toolbar wrapper
- Keep these comments in the generated code as they are part of the project documentation.
1. Use <!-- controlType -->, <!-- targetAggregation --> comments to identify the fragment's context.
2. Provide ONLY the inner content suitable for the parent control (e.g., Button for Toolbar).
3. Do not wrap the content in the controlType - it's already the parent container.
4. If the user requests a specific control type, verify it's suitable for the parent container. If not, inform the user why.
5. Take specific control prompts with priority
6. Add a stable id to each element in the fragment

CONTROLLER EXTENSION WORKFLOW:
1. Read manifest.appdescr_variant:
   - Extract 'id' property (app variant ID) - used for change file namespace
   - Extract 'layer' property - determines if a customer prefix is needed
   - CUSTOMER_BASE layer requires "customer" prefix in:
     * Fragment event handlers: press=".extension.customer.{project}.{Controller}.{method}"
     * Controller extension namespace: ControllerExtension.extend("customer.{project}.{Controller}", {...})

2. Determine project folder name:
   - Use the adaptation project root folder name (the folder that contains webapp)
   - This is used in both fragment event handlers and controller extension namespace

3. Create controller extension file:
   - File path: webapp/changes/coding/{ControllerExtName}.js (NO customer prefix in path)
   - Do NOT add .controller to the file name
   - Use sap.ui.define with "sap/ui/core/mvc/ControllerExtension" (NOT sap/ui/core/mvc/Controller)
   - Namespace pattern:
     * Standard layer: return ControllerExtension.extend("{project-folder}.{ControllerExtName}", {...});
     * CUSTOMER_BASE layer: return ControllerExtension.extend("customer.{project-folder}.{ControllerExtName}", {...});
   - Example (standard): ControllerExtension.extend("adapt.blog.ControllerExt", {...})
   - Example (CUSTOMER_BASE): ControllerExtension.extend("customer.adapt.blog.ControllerExt", {...})

4. Create XML fragment file (if needed):
   - Add stable, unique IDs to ALL controls and sub-elements
   - Wire event handlers with proper namespace pattern:
     * Standard layer: press=".extension.{project-folder}.{ControllerExt}.{methodName}"
     * CUSTOMER_BASE layer: press=".extension.customer.{project-folder}.{ControllerExt}.{methodName}"
   - The "customer" prefix matches the controller extension namespace
   - The ".extension" prefix is ONLY used in fragment XML event handlers

5. Do not create duplicate files:
   - Do not create a new controller extension file if one already exists for the selected view

OUTPUT REQUIREMENTS:
- Each response must be self-contained and production-ready.
- Each file must be complete, not partial.
- Maintain consistent namespaces and controller references.
- Follow adaptation project structure and conventions.
- Include comments in code only where useful to explain complex logic.
- CRITICAL: Assign stable, unique IDs to all controls, elements, subcontrols, items, and sub-items—even when they have a key or an identifying attribute. Verify all elements have IDs before responding.`;

/**
 * Builds a progressive disclosure response with the knowledge base and project context.
 *
 * @param appPath
 * @param reason
 * @param projectContext
 * @param projectContext.layer
 * @param projectContext.variantId
 * @param projectContext.projectFolderName
 * @param existingFiles
 */
function buildKnowledgeBaseResponse(
    appPath: string,
    reason: string,
    projectContext?: { layer: string; variantId: string; projectFolderName: string },
    existingFiles?: ExistingProjectFile[]
): ExecuteFunctionalityOutput {
    let message = `${reason}\n\n`;
    message += `=== GENERATION RULES ===\n${KNOWLEDGE_BASE}\n\n`;
    message += `=== HOW TO CALL THIS TOOL ===\n`;
    message += `1. Generate code following the rules above\n`;
    message += `2. Format with markdown code blocks, each preceded by "**Path:** fullFilePath" on its own line\n`;
    message += `3. Call this tool again with the 'aiResponse' parameter containing the generated code\n\n`;

    if (projectContext) {
        message += `=== PROJECT CONTEXT ===\n`;
        message += `- Layer: ${projectContext.layer}\n`;
        message += `- Variant ID: ${projectContext.variantId}\n`;
        message += `- Project folder name: ${projectContext.projectFolderName}\n`;
        message += `- Customer prefix required: ${projectContext.layer === 'CUSTOMER_BASE' ? 'YES' : 'NO'}\n\n`;
    }

    if (existingFiles && existingFiles.length > 0) {
        message += `=== EXISTING PROJECT FILES ===\n`;
        message += `IMPORTANT: The following files already exist in this project. `;
        message += `You MUST modify these existing files rather than creating new ones. `;
        message += `Add your new methods to the existing controller extension and update existing fragments.\n\n`;
        for (const file of existingFiles) {
            message += `--- ${file.relativePath} ---\n${file.content}\n\n`;
        }
    }

    return {
        functionalityId: ADP_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
        status: 'info',
        message,
        parameters: {},
        appPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}

/**
 * Processes AI-generated controller extensions and fragments for SAPUI5 Adaptation Projects.
 * When called without aiResponse, returns the knowledge base and project context for progressive disclosure.
 *
 * @param params - Input parameters including appPath, prompt, aiResponse, and controllerName.
 * @returns A promise resolving to the execution output.
 */
export async function adpControllerExtension(params: AdpControllerExtensionInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath, prompt, aiResponse } = params;

    if (!appPath) {
        return buildKnowledgeBaseResponse(
            appPath ?? '',
            'Missing required parameter: appPath. Provide the absolute path to the adaptation project root directory.'
        );
    }

    if (!isAdaptationProject(appPath)) {
        return buildKnowledgeBaseResponse(
            appPath,
            'This is not an adaptation project. Please ensure manifest.appdescr_variant exists in the webapp folder.'
        );
    }

    // Read project context for progressive disclosure
    let variant;
    try {
        variant = await readManifestVariant(appPath);
    } catch (error) {
        const errorMessage = `Failed to read manifest.appdescr_variant: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMessage);
        return {
            functionalityId: ADP_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
            status: 'error',
            message: errorMessage,
            parameters: params,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    const layer = variant.layer ?? '';
    const variantId = variant.id ?? '';
    const projectFolderName = getProjectFolderName(appPath);
    const projectContext = { layer: String(layer), variantId, projectFolderName };

    logger.debug(`Manifest variant - layer: ${layer}, id: ${variantId}`);
    logger.debug(`Project folder name: ${projectFolderName}`);

    // Progressive disclosure: if no aiResponse, return knowledge base + project context + existing files
    if (!aiResponse?.trim()) {
        const existingFiles = await scanExistingProjectFiles(appPath);
        logger.debug(`Found ${existingFiles.length} existing project files`);

        const reason = prompt
            ? `Prompt received: "${prompt}"\n\nNo aiResponse provided. Generate the code following the rules below, then call this tool again with the aiResponse parameter.`
            : 'No prompt or aiResponse provided. Provide a prompt describing what to create, generate the code following the rules below, then call this tool again with the aiResponse parameter.';
        return buildKnowledgeBaseResponse(appPath, reason, projectContext, existingFiles);
    }

    // Full execution path: aiResponse is present
    logger.info(`Executing ADP controller extension functionality for: ${prompt}`);

    const changes: string[] = [];

    logger.info('Processing AI response to extract files');
    const extractedFiles = extractFilesFromResponse(aiResponse);
    logger.info(`Extracted ${extractedFiles.length} files from AI response`);

    for (const file of extractedFiles) {
        let normalizedPath = file.path.replace(/\\/g, '/');

        if (isAbsolute(normalizedPath)) {
            const resolvedAppPath = resolve(appPath);
            const resolvedFilePath = resolve(normalizedPath);
            const appPathWithSep = resolvedAppPath.endsWith(sep) ? resolvedAppPath : resolvedAppPath + sep;

            if (resolvedFilePath.startsWith(appPathWithSep) || resolvedFilePath === resolvedAppPath) {
                normalizedPath = relative(resolvedAppPath, resolvedFilePath);
            } else {
                const errorMessage = `File path ${normalizedPath} is outside the application path ${appPath}`;
                logger.error(errorMessage);
                return {
                    functionalityId: ADP_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
                    status: 'error',
                    message: errorMessage,
                    parameters: params,
                    appPath,
                    changes: [],
                    timestamp: new Date().toISOString()
                };
            }
        }

        if (isChangeFile(normalizedPath)) {
            logger.debug(`Skipping change file: ${normalizedPath}`);
            continue;
        }

        try {
            const fullPath = join(appPath, normalizedPath);
            const fileDir = dirname(fullPath);
            await FSpromises.mkdir(fileDir, { recursive: true });
            await FSpromises.writeFile(fullPath, file.code, 'utf-8');
            logger.info(`Created file: ${normalizedPath}`);
            changes.push(`Created ${normalizedPath}`);
        } catch (error) {
            const errorMessage = `Failed to write file ${normalizedPath}: ${error instanceof Error ? error.message : String(error)}`;
            logger.error(errorMessage);
            return {
                functionalityId: ADP_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
                status: 'error',
                message: errorMessage,
                parameters: params,
                appPath,
                changes,
                timestamp: new Date().toISOString()
            };
        }
    }

    const fileCreations = changes.filter((c) => c.startsWith('Created '));
    const status = fileCreations.length > 0 ? 'success' : 'skipped';
    const message =
        fileCreations.length > 0
            ? `Successfully processed ${fileCreations.length} file(s) for ADP controller extension`
            : 'No files were processed. Provide aiResponse parameter with code blocks to generate files.';

    return {
        functionalityId: ADP_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
        status,
        message,
        parameters: params,
        appPath,
        changes,
        timestamp: new Date().toISOString()
    };
}
