import type { Message, ImportProjectInfo } from '../types.js';
import type { Editor } from 'mem-fs-editor';
import { validateMetadata } from '../utils/index.js';
import { describeError } from '../utils/migration-utils.js';
import { MigrationTypes, postMigrationAction } from '../utils/constants.js';
import { updateExtConfigJson } from '../components/extension.js';
import { i18nText } from '../i18n.js';
import { getMessageType } from '../utils/validation-severity.js';

/**
 * Validates metadata configuration and adds warning/error message if missing
 *
 * @param fs - mem-fs editor
 * @param rootPath - Root path of the project
 * @param projectInfo - Project information
 * @param manifestJSON - Manifest JSON object
 * @param messages - Array to collect validation messages
 * @param strict - Enable strict validation mode (WARNING becomes ERROR)
 */
export function validateAndReportMetadata(
    fs: Editor,
    rootPath: string,
    projectInfo: ImportProjectInfo,
    manifestJSON: any,
    messages: Message[],
    strict: boolean = false
): void {
    const metadataValidation = validateMetadata(
        rootPath,
        projectInfo.webappPath,
        projectInfo.isSAPApp,
        manifestJSON,
        fs
    );

    if (
        !(metadataValidation.config && metadataValidation.fileExists) &&
        projectInfo.type !== MigrationTypes.projectExtension
    ) {
        messages.push({
            type: getMessageType('WARNING', strict, true),
            description: i18nText('MISSING_METADATA_CONFIG'),
            action: postMigrationAction.serviceManager
        });
    }
}

/**
 * Handles extension project configuration update
 *
 * @param fs - mem-fs editor
 * @param rootPath - Root path of the project
 * @param projectInfo - Project information
 */
export function handleExtensionProjectConfig(fs: Editor, rootPath: string, projectInfo: ImportProjectInfo): void {
    if (projectInfo.type === MigrationTypes.projectExtension && projectInfo.extensionProjectSettings) {
        updateExtConfigJson(fs, rootPath, projectInfo);
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
 * @param projectRoot - Absolute path of the project, so a file in the error is reported relative to it
 * @returns Formatted error message
 */
export function createMigrationErrorMessage(e: any, projectRoot?: string): string {
    return `Error copying common files: ${describeError(e, projectRoot)}`;
}
