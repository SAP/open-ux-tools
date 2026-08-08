import type { Message, ImportProjectInfo } from '../types.js';
import { validateMetadata, determineMessage } from '../utils/index.js';
import { MigrationTypes, postMigrationAction } from '../utils/constants.js';
import { updateExtConfigJson } from '../components/extension.js';
import { i18nText } from '../i18n.js';

/**
 * Validates metadata configuration and adds warning message if missing
 *
 * @param rootPath - Root path of the project
 * @param projectInfo - Project information
 * @param manifestJSON - Manifest JSON object
 * @param messages - Array to collect validation messages
 */
export async function validateAndReportMetadata(
    rootPath: string,
    projectInfo: ImportProjectInfo,
    manifestJSON: any,
    messages: Message[]
): Promise<void> {
    const metadataValidation = await validateMetadata(
        rootPath,
        projectInfo.webappPath,
        projectInfo.isSAPApp,
        manifestJSON
    );

    if (
        !(metadataValidation.config && metadataValidation.fileExists) &&
        projectInfo.type !== MigrationTypes.projectExtension
    ) {
        messages.push({
            type: 'WARNING',
            description: i18nText('MISSING_METADATA_CONFIG'),
            action: postMigrationAction.serviceManager
        });
    }
}

/**
 * Handles extension project configuration update
 *
 * @param rootPath - Root path of the project
 * @param projectInfo - Project information
 */
export async function handleExtensionProjectConfig(rootPath: string, projectInfo: ImportProjectInfo): Promise<void> {
    if (projectInfo.type === MigrationTypes.projectExtension && projectInfo.extensionProjectSettings) {
        await updateExtConfigJson(rootPath, projectInfo);
    }
}

/**
 * Checks if any error messages exist in the messages array
 *
 * @param messages - Array of messages
 * @returns true if no errors, false if errors exist
 */
export function checkForErrors(messages: Message[]): boolean {
    return messages.filter((msg) => ['ERROR'].includes(msg.type)).length === 0;
}

/**
 * Creates error message for migration failure
 *
 * @param e - Error object
 * @returns Formatted error message
 */
export function createMigrationErrorMessage(e: any): string {
    const errorText =
        e.name === 'MigrationError' ? e.message.toString() : determineMessage(e) || e.message?.toString() || String(e);
    return `Error copying common files: ${errorText}`;
}
