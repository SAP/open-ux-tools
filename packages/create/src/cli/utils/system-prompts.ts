import prompts from 'prompts';
import type { BackendSystem } from '@sap-ux/store';
import { SystemType, AuthenticationType, ConnectionType } from '@sap-ux/store';
import { validateClient } from '@sap-ux/project-input-validator';
import { systemNameExists } from './system-name-validation.js';

/**
 * Checks if a string is empty or contains only whitespace.
 *
 * @param value - The value to check
 * @returns true if empty, false otherwise
 */
function isEmptyString(value: string): boolean {
    return !value || !/\S/.test(value);
}

/**
 * Checks if a string is a valid URL.
 *
 * @param value - The value to check
 * @returns true if valid URL, false otherwise
 */
function isValidUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return !!url.protocol && !!url.host;
    } catch {
        return false;
    }
}

/**
 * Validates that a string is not empty after trimming whitespace.
 *
 * @param value - The value to validate
 * @returns True if valid, error message otherwise
 */
function validateNonEmpty(value: string): true | string {
    return isEmptyString(value) ? 'This field is required and cannot be empty' : true;
}

/**
 * Validates that a URL is in correct format.
 *
 * @param value - The URL to validate
 * @returns True if valid, error message otherwise
 */
function validateUrlField(value: string): true | string {
    const nonEmptyCheck = validateNonEmpty(value);
    if (nonEmptyCheck !== true) {
        return nonEmptyCheck;
    }

    return isValidUrl(value) ? true : 'Please enter a valid URL (e.g., https://my-system.example.com)';
}

/**
 * Validates that a client number is in correct format (empty or 3-digit number).
 *
 * @param value - The client number to validate
 * @returns True if valid, error message otherwise
 */
function validateClientField(value: string): true | string {
    const result = validateClient(value);
    // validateClient returns true | string
    return result === true ? true : String(result);
}

/**
 * Validates that a system name is unique (not already in use).
 *
 * @param value - The system name to validate
 * @param excludeSystem - Optional system to exclude from check (for updates)
 * @returns True if valid, error message otherwise
 */
async function validateSystemNameUniqueness(value: string, excludeSystem?: BackendSystem): Promise<true | string> {
    const nonEmptyCheck = validateNonEmpty(value);
    if (nonEmptyCheck !== true) {
        return nonEmptyCheck;
    }

    try {
        const isTaken = await systemNameExists(value, { excludeSystem });
        if (isTaken) {
            return `A system with the name '${value}' already exists. Please choose a different name.`;
        }
        return true;
    } catch (error) {
        // Catch and convert service errors to validation messages to prevent duplicate names
        console.error('Error checking system name uniqueness:', error);
        return 'Unable to check system name uniqueness. Please try again.';
    }
}

/**
 * Validates that a system name is unique when updating (excluding the current system).
 *
 * @param value - The system name to validate
 * @param currentSystem - The system being updated (to exclude from uniqueness check)
 * @returns True if valid, error message otherwise
 */
async function validateSystemNameUniquenessForUpdate(
    value: string,
    currentSystem: BackendSystem
): Promise<true | string> {
    const nonEmptyCheck = validateNonEmpty(value);
    if (nonEmptyCheck !== true) {
        return nonEmptyCheck;
    }

    try {
        const isTaken = await systemNameExists(value, { excludeSystem: currentSystem });
        if (isTaken) {
            return `A system with the name '${value}' already exists. Please choose a different name.`;
        }
        return true;
    } catch (error) {
        // Catch and convert service errors to validation messages to prevent duplicate names
        console.error('Error checking system name uniqueness:', error);
        return 'Unable to check system name uniqueness. Please try again.';
    }
}

/**
 * Prompts for complete system configuration, filling in any missing fields.
 *
 * @param partial - Partial system configuration with some fields already provided
 * @param partial.name
 * @param partial.url
 * @param partial.client
 * @param partial.systemType
 * @param partial.authenticationType
 * @param partial.connectionType
 * @param partial.username
 * @param partial.password
 * @returns Complete system configuration with all required fields
 */
export async function promptForSystemConfig(partial: {
    name?: string;
    url?: string;
    client?: string;
    systemType?: string;
    authenticationType?: string;
    connectionType?: string;
    username?: string;
    password?: string;
}): Promise<{
    name: string;
    url: string;
    client?: string;
    systemType: string;
    authenticationType: string;
    connectionType: string;
    username?: string;
    password?: string;
}> {
    const questions: prompts.PromptObject[] = [];

    if (!partial.name) {
        questions.push({
            type: 'text',
            name: 'name',
            message: 'System name (display name):',
            validate: (value: string) => validateSystemNameUniqueness(value)
        });
    }

    if (!partial.url) {
        questions.push({
            type: 'text',
            name: 'url',
            message: 'System URL:',
            validate: validateUrlField
        });
    }

    if (partial.client === undefined) {
        questions.push({
            type: 'text',
            name: 'client',
            message: 'SAP client (optional, press Enter to skip):',
            validate: validateClientField
        });
    }

    if (!partial.systemType) {
        questions.push({
            type: 'select',
            name: 'systemType',
            message: 'System type:',
            choices: Object.values(SystemType).map((type) => ({ title: type, value: type }))
        });
    }

    if (!partial.authenticationType) {
        questions.push({
            type: 'select',
            name: 'authenticationType',
            message: 'Authentication type:',
            choices: Object.values(AuthenticationType).map((type) => ({ title: type, value: type }))
        });
    }

    if (!partial.connectionType) {
        questions.push({
            type: 'select',
            name: 'connectionType',
            message: 'Connection type:',
            choices: Object.values(ConnectionType).map((type) => ({ title: type, value: type }))
        });
    }

    if (partial.username === undefined) {
        questions.push({
            type: 'text',
            name: 'username',
            message: 'Username (optional, press Enter to skip):'
        });
    }

    if (partial.password === undefined) {
        questions.push({
            type: 'password',
            name: 'password',
            message: 'Password (optional, press Enter to skip):'
        });
    }

    const answers = questions.length > 0 ? await prompts(questions as any) : {};

    return {
        name: partial.name || answers.name,
        url: partial.url || answers.url,
        client: partial.client ?? (answers.client || undefined),
        systemType: partial.systemType || answers.systemType,
        authenticationType: partial.authenticationType || answers.authenticationType,
        connectionType: partial.connectionType || answers.connectionType,
        username: partial.username ?? (answers.username || undefined),
        password: partial.password ?? (answers.password || undefined)
    };
}

/**
 * Prompts for system identifier (URL and optional client).
 *
 * @param partial - Partial identifier with some fields already provided
 * @param partial.url
 * @param partial.client
 * @returns System identifier with URL and optional client
 */
export async function promptForSystemIdentifier(partial: { url?: string; client?: string }): Promise<{
    url: string;
    client?: string;
}> {
    const questions: prompts.PromptObject[] = [];

    if (!partial.url) {
        questions.push({
            type: 'text',
            name: 'url',
            message: 'System URL:',
            validate: validateUrlField
        });
    }

    if (partial.client === undefined) {
        questions.push({
            type: 'text',
            name: 'client',
            message: 'SAP client (optional, press Enter to skip):',
            validate: validateClientField
        });
    }

    const answers = questions.length > 0 ? await prompts(questions as any) : {};

    return {
        url: partial.url || answers.url,
        client: partial.client ?? (answers.client || undefined)
    };
}

/**
 * Prompts user to select which fields they want to update.
 *
 * @param existing - Existing system configuration
 * @returns Array of field names to update
 */
export async function promptForUpdateFields(existing: BackendSystem): Promise<string[]> {
    const answer = await prompts({
        type: 'multiselect',
        name: 'fields',
        message: 'Select fields to update:',
        choices: [
            { title: `Name (current: ${existing.name})`, value: 'name' },
            { title: `Username (current: ${existing.username || '(none)'})`, value: 'username' },
            { title: 'Password', value: 'password' }
        ],
        min: 1
    });

    if (!answer.fields || answer.fields.length === 0) {
        throw new Error('At least one field must be selected');
    }

    return answer.fields;
}

/**
 * Prompts for new values for the specified fields.
 *
 * @param fields - Array of field names to prompt for
 * @param existing - Existing system configuration
 * @returns Object with new values for the specified fields
 */
export async function promptForFieldUpdates(
    fields: string[],
    existing: BackendSystem
): Promise<Record<string, unknown>> {
    const questions = fields
        .map((field) => {
            switch (field) {
                case 'name':
                    return {
                        type: 'text',
                        name: 'name',
                        message: 'New system name:',
                        initial: existing.name,
                        validate: (value: string) => validateSystemNameUniquenessForUpdate(value, existing)
                    };
                case 'username':
                    return {
                        type: 'text',
                        name: 'username',
                        message: 'New username:',
                        initial: existing.username || '',
                        validate: validateNonEmpty
                    };
                case 'password':
                    return {
                        type: 'password',
                        name: 'password',
                        message: 'New password:',
                        validate: validateNonEmpty
                    };
                default:
                    return null;
            }
        })
        .filter((q) => q !== null);

    return await prompts(questions as any);
}

/**
 * Prompts for confirmation before removing a system.
 *
 * @param systemName - Name or identifier of the system to remove
 * @returns True if user confirms, false otherwise
 */
export async function promptForRemoveConfirmation(systemName: string): Promise<boolean> {
    const answer = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove system '${systemName}'?`,
        initial: false
    });

    return answer.confirm === true;
}
