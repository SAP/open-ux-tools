import { getVariant, type DescriptorVariant, FlexLayer } from '@sap-ux/adp-tooling';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { logger } from '../../../utils/logger';

export interface ExtractedFile {
    path: string;
    code: string;
}

/**
 * Extract files from AI response containing markdown code blocks with Path markers
 *
 * @param content - The AI response content with markdown code blocks
 * @returns Array of extracted files with path and code
 */
export function extractFilesFromResponse(content: string): ExtractedFile[] {
    const codeBlocks: ExtractedFile[] = [];
    const lines = content.split('\n');
    let currentPath = '';
    let inCodeBlock = false;
    let currentCode = '';

    for (const line of lines) {
        // Look for **Path:** markers
        const pathMatch = line.match(/\*\*Path:\*\*\s*(.+)/);
        if (pathMatch) {
            currentPath = pathMatch[1].trim();
            continue;
        }

        // Look for code block start
        if (line.match(/^```(\w+)?/) && !inCodeBlock) {
            inCodeBlock = true;
            currentCode = '';
            continue;
        }

        // Look for code block end
        if (line.startsWith('```') && inCodeBlock) {
            inCodeBlock = false;
            if (currentPath && currentCode.trim()) {
                codeBlocks.push({
                    path: currentPath,
                    code: currentCode.trim()
                });
            }
            currentPath = '';
            currentCode = '';
            continue;
        }

        // Collect code content
        if (inCodeBlock) {
            currentCode += line + '\n';
        }
    }

    return codeBlocks;
}

/**
 * Check if the file path represents a controller extension
 *
 * @param filePath - The file path to check
 * @returns True if the file is a controller extension
 */
export function isControllerExtensionFile(filePath: string): boolean {
    const normalizedPath = filePath.toLowerCase();

    // Primary check: files in changes/coding folder (proper adaptation project structure)
    const isInChangesFolder = normalizedPath.includes('changes/coding') || normalizedPath.includes('changes\\coding');
    const isJsOrTs = normalizedPath.endsWith('.js') || normalizedPath.endsWith('.ts');
    const hasControllerKeywords =
        normalizedPath.includes('controller') || normalizedPath.includes('extension') || normalizedPath.includes('ext');

    const isPrimaryMatch = isInChangesFolder && isJsOrTs && hasControllerKeywords;

    // Secondary check: controller files that extend ControllerExtension (even if in wrong location)
    const isControllerFile = normalizedPath.includes('controller') && isJsOrTs;

    // Enhanced check: look for ControllerExtension pattern in the path
    const hasExtensionPattern =
        normalizedPath.includes('controllerext') ||
        normalizedPath.includes('controller.ext') ||
        normalizedPath.includes('extension');

    const isSecondaryMatch = isControllerFile && hasExtensionPattern;

    const result = isPrimaryMatch || isSecondaryMatch;
    logger.debug(
        `isControllerExtensionFile(${filePath}): primary=${isPrimaryMatch}, secondary=${isSecondaryMatch}, result=${result}`
    );

    return result;
}

/**
 * Check if the file content looks like a controller extension
 *
 * @param content - The file content to check
 * @returns True if the content is a controller extension
 */
export function isControllerExtensionContent(content: string): boolean {
    const normalizedContent = content.toLowerCase();
    const result =
        normalizedContent.includes('controllerextension') || normalizedContent.includes('controller.extension');
    logger.debug(`isControllerExtensionContent: result=${result}`);
    return result;
}

/**
 * Check if the file path is a change file
 *
 * @param filePath - The file path to check
 * @returns True if the file is a change file
 */
export function isChangeFile(filePath: string): boolean {
    const normalizedPath = filePath.toLowerCase();
    return normalizedPath.endsWith('.change');
}

/**
 * Get project folder name from app path
 *
 * @param appPath - The application path
 * @returns The project folder name
 */
export function getProjectFolderName(appPath: string): string {
    const pathParts = appPath.split(/[/\\]/).filter((part) => part.length > 0);
    // Get the last non-empty part (project folder name)
    return pathParts[pathParts.length - 1] || '';
}

/**
 * Generate controller extension namespace based on layer and project folder
 *
 * @param projectFolderName - The project folder name
 * @param controllerExtName - The controller extension name
 * @param layer - The FlexLayer from manifest.appdescr_variant
 * @returns The namespace string for ControllerExtension.extend()
 */
export function generateControllerExtensionNamespace(
    projectFolderName: string,
    controllerExtName: string,
    layer: string
): string {
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
    if (isCustomerBase) {
        return `customer.${projectFolderName}.${controllerExtName}`;
    }
    return `${projectFolderName}.${controllerExtName}`;
}

/**
 * Generate fragment event handler namespace for XML fragments
 *
 * @param projectFolderName - The project folder name
 * @param controllerExtName - The controller extension name
 * @param methodName - The method name
 * @param layer - The FlexLayer from manifest.appdescr_variant
 * @returns The event handler namespace string (e.g., ".extension.project.ControllerExt.methodName")
 */
export function generateFragmentEventHandlerNamespace(
    projectFolderName: string,
    controllerExtName: string,
    methodName: string,
    layer: string
): string {
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
    if (isCustomerBase) {
        return `.extension.customer.${projectFolderName}.${controllerExtName}.${methodName}`;
    }
    return `.extension.${projectFolderName}.${controllerExtName}.${methodName}`;
}

/**
 * Read manifest.appdescr_variant file
 *
 * @param appPath - The application path
 * @returns The DescriptorVariant object
 */
export async function readManifestVariant(appPath: string): Promise<DescriptorVariant> {
    return getVariant(appPath);
}

/**
 * Check if the project is an adaptation project by checking for manifest.appdescr_variant
 *
 * @param appPath - The application path
 * @returns True if it's an adaptation project
 */
export function isAdaptationProject(appPath: string): boolean {
    const manifestVariantPath = join(appPath, 'webapp', 'manifest.appdescr_variant');
    return existsSync(manifestVariantPath);
}
