import { input, select, password, confirm, checkbox } from '@inquirer/prompts';
import type { BackendSystem } from '@sap-ux/store';
import { SystemType, AuthenticationType, ConnectionType, isSystemNameInUse } from '@sap-ux/store';
import { validateClient } from '@sap-ux/project-input-validator';

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
        const isTaken = await isSystemNameInUse(value);
        // Allow keeping the same name when updating (case-insensitive)
        if (excludeSystem && isTaken) {
            const isSameName = excludeSystem.name.trim().toLowerCase() === value.trim().toLowerCase();
            if (isSameName) {
                return true;
            }
        }
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
        const isTaken = await isSystemNameInUse(value);
        // Allow keeping the same name (case-insensitive)
        const isSameName = currentSystem.name.trim().toLowerCase() === value.trim().toLowerCase();
        if (isTaken && !isSameName) {
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
    const answers: Record<string, any> = {};

    if (!partial.name) {
        answers.name = await input({
            message: 'System name (display name):',
            validate: async (value: string) => {
                const result = await validateSystemNameUniqueness(value);
                return result === true ? true : result;
            }
        });
    }

    if (!partial.url) {
        answers.url = await input({
            message: 'System URL:',
            validate: (value: string) => {
                const result = validateUrlField(value);
                return result === true ? true : result;
            }
        });
    }

    if (partial.client === undefined) {
        answers.client = await input({
            message: 'SAP client (optional, press Enter to skip):',
            validate: (value: string) => {
                if (!value) {
                    return true;
                }
                const result = validateClientField(value);
                return result === true ? true : result;
            }
        });
    }

    if (!partial.systemType) {
        answers.systemType = await select({
            message: 'System type:',
            choices: Object.values(SystemType).map((type) => ({ name: type, value: type }))
        });
    }

    if (!partial.authenticationType) {
        answers.authenticationType = await select({
            message: 'Authentication type:',
            choices: Object.values(AuthenticationType).map((type) => ({ name: type, value: type }))
        });
    }

    if (!partial.connectionType) {
        answers.connectionType = await select({
            message: 'Connection type:',
            choices: Object.values(ConnectionType).map((type) => ({ name: type, value: type }))
        });
    }

    if (partial.username === undefined) {
        answers.username = await input({
            message: 'Username (optional, press Enter to skip):'
        });
    }

    if (partial.password === undefined) {
        answers.password = await password({
            message: 'Password (optional, press Enter to skip):'
        });
    }

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
    const answers: Record<string, any> = {};

    if (!partial.url) {
        answers.url = await input({
            message: 'System URL:',
            validate: (value: string) => {
                const result = validateUrlField(value);
                return result === true ? true : result;
            }
        });
    }

    if (partial.client === undefined) {
        answers.client = await input({
            message: 'SAP client (optional, press Enter to skip):',
            validate: (value: string) => {
                if (!value) {
                    return true;
                }
                const result = validateClientField(value);
                return result === true ? true : result;
            }
        });
    }

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
    const fields = await checkbox({
        message: 'Select fields to update:',
        choices: [
            { name: `Name (current: ${existing.name})`, value: 'name' },
            { name: `Username (current: ${existing.username || '(none)'})`, value: 'username' },
            { name: 'Password', value: 'password' }
        ],
        validate: (selected: readonly { value: string }[]) => {
            if (selected.length === 0) {
                return 'At least one field must be selected';
            }
            return true;
        }
    });

    return fields;
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
    const answers: Record<string, unknown> = {};

    for (const field of fields) {
        switch (field) {
            case 'name':
                answers.name = await input({
                    message: 'New system name:',
                    default: existing.name,
                    validate: async (value: string) => {
                        const result = await validateSystemNameUniquenessForUpdate(value, existing);
                        return result === true ? true : result;
                    }
                });
                break;
            case 'username':
                answers.username = await input({
                    message: 'New username:',
                    default: existing.username || '',
                    validate: (value: string) => {
                        const result = validateNonEmpty(value);
                        return result === true ? true : result;
                    }
                });
                break;
            case 'password':
                answers.password = await password({
                    message: 'New password:',
                    validate: (value: string) => {
                        const result = validateNonEmpty(value);
                        return result === true ? true : result;
                    }
                });
                break;
        }
    }

    return answers;
}

/**
 * Prompts for confirmation before removing a system.
 *
 * @param systemName - Name or identifier of the system to remove
 * @returns True if user confirms, false otherwise
 */
export async function promptForRemoveConfirmation(systemName: string): Promise<boolean> {
    const result = await confirm({
        message: `Are you sure you want to remove system '${systemName}'?`,
        default: false
    });

    return result;
}
