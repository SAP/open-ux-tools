import { t } from '../i18n';
import type { CfSystemChoice, CfAppRouterDeployConfigAnswers } from '../types';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ErrorHandler } from '@sap-ux/inquirer-common';

/**
 *
 * @param input The input string to check for emptiness.
 * @returns returns true if the input string is not empty, otherwise false.
 */
function isNotEmpty(input: string): boolean {
    return !!input?.trim();
}

/**
 * Validates the input string for the following:
 * - It must not be empty after trimming whitespace.
 * - It must contain only alphanumeric characters, underscores, or dashes.
 * - It must not exceed 200 characters.
 *
 * @param {string} input - The input string to validate.
 * @returns {boolean|string} `true` if the input is valid, otherwise an error message.
 */
function validateInput(input: string): boolean | string {
    if (!isNotEmpty(input)) {
        return t('errors.emptyDestinationNameError');
    }
    const result = /^[a-z0-9_-]+$/i.test(input);
    if (!result) {
        return t('errors.destinationNameError');
    }
    if (input.length > 200) {
        return t('errors.destinationNameLengthError');
    }
    return true;
}

/**
 * Validates the destination name or input string. If `allowEmptyChoice` is true,
 * the validation will pass immediately. Otherwise, the input will be validated
 * against rules (non-empty, valid characters, length check).
 *
 * @param {string} input - The destination name or input string to validate.
 * @param {boolean} allowEmptyChoice - Whether to allow an empty input as a valid choice.
 * @returns {boolean|string} `true` if the input is valid or empty choices are allowed, otherwise an error message.
 */
export function validateDestinationQuestion(
    input: string | CfSystemChoice,
    allowEmptyChoice: boolean = false
): boolean | string {
    if (allowEmptyChoice) {
        return true;
    }
    return typeof input === 'string' ? validateInput(input) : true;
}

/**
 * Validates the provided MTA path.
 *
 * @param {string} input - The input string representing the MTA path to validate.
 * @returns {boolean|string} - Returns `true` if the path is valid, or an error message if the path is invalid or does not exist.
 */
export function validateMtaPath(input: string): boolean | string {
    const filePath = input?.trim();
    return (filePath && existsSync(filePath)) || t('errors.folderDoesNotExistError', { filePath: filePath });
}

/**
 * Validates the provided MTA ID.
 *
 * This function performs the following checks:
 * - Ensures the input is a non-empty string.
 * - Validates the input against a regex pattern.
 * - Checks if the MTA ID already exists in the specified path.
 *
 * @param {string} input - The MTA ID to validate.
 * @param {CfAppRouterDeployConfigAnswers} previousAnswers - The previous answers, containing the MTA path.
 * @returns {boolean|string} - Returns true if the MTA ID is valid, or an error message if validation fails.
 */
export function validateMtaId(input: string, previousAnswers: CfAppRouterDeployConfigAnswers): boolean | string {
    if (typeof input !== 'string' || !input.trim()) {
        return t('errors.noMtaIdError');
    }
    if (input.length > 100) {
        return t('errors.invalidMtaIdError');
    }
    const idPattern = /^[a-zA-Z_][a-zA-Z0-9_-]{0,98}[a-zA-Z0-9]$/;
    if (!idPattern.exec(input)) {
        return t('errors.invalidMtaIdError');
    }
    if (existsSync(join(previousAnswers.mtaPath, input.trim()))) {
        return t('errors.mtaIdAlreadyExistError', { mtaPath: previousAnswers.mtaPath });
    }

    // All checks passed
    return true;
}

/**
 * Validates the ABAP service choice and provides error handling.
 *
 * @param {string} choice - The selected choice for the ABAP service.
 * @param {ErrorHandler} errorHandler - An instance of an error handler.
 * @returns {string | boolean} - Returns `true` if the choice is valid.
 */
export function validateAbapService(choice: string, errorHandler: ErrorHandler): string | boolean {
    if (!choice) {
        const userMsg = errorHandler.getErrorMsg('', true);
        const checkConsoleMsg = t('errors.errorScpAbapSourceDiscoveryCheckLog');
        return userMsg ? `${userMsg} ${checkConsoleMsg}` : false;
    }
    return true;
}
