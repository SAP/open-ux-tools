import prompts from 'prompts';
import type { BackendSystem } from '@sap-ux/store';
import { SystemType, AuthenticationType, ConnectionType } from '@sap-ux/store';

/**
 * Prompts for complete system configuration, filling in any missing fields.
 *
 * @param partial - Partial system configuration with some fields already provided
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
    const questions = [];

    if (!partial.name) {
        questions.push({
            type: 'text',
            name: 'name',
            message: 'System name (display name):'
        });
    }

    if (!partial.url) {
        questions.push({
            type: 'text',
            name: 'url',
            message: 'System URL:'
        });
    }

    if (partial.client === undefined) {
        questions.push({
            type: 'text',
            name: 'client',
            message: 'SAP client (optional, press Enter to skip):'
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

    const answers = questions.length > 0 ? await prompts(questions) : {};

    return {
        name: partial.name || answers.name,
        url: partial.url || answers.url,
        client: partial.client !== undefined ? partial.client : (answers.client || undefined),
        systemType: partial.systemType || answers.systemType,
        authenticationType: partial.authenticationType || answers.authenticationType,
        connectionType: partial.connectionType || answers.connectionType,
        username: partial.username !== undefined ? partial.username : (answers.username || undefined),
        password: partial.password !== undefined ? partial.password : (answers.password || undefined)
    };
}

/**
 * Prompts for system identifier (URL and optional client).
 *
 * @param partial - Partial identifier with some fields already provided
 * @returns System identifier with URL and optional client
 */
export async function promptForSystemIdentifier(partial: {
    url?: string;
    client?: string;
}): Promise<{
    url: string;
    client?: string;
}> {
    const questions = [];

    if (!partial.url) {
        questions.push({
            type: 'text',
            name: 'url',
            message: 'System URL:'
        });
    }

    if (partial.client === undefined) {
        questions.push({
            type: 'text',
            name: 'client',
            message: 'SAP client (optional, press Enter to skip):'
        });
    }

    const answers = questions.length > 0 ? await prompts(questions) : {};

    return {
        url: partial.url || answers.url,
        client: partial.client !== undefined ? partial.client : (answers.client || undefined)
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
    const questions = fields.map((field) => {
        switch (field) {
            case 'name':
                return {
                    type: 'text',
                    name: 'name',
                    message: 'New system name:',
                    initial: existing.name
                };
            case 'username':
                return {
                    type: 'text',
                    name: 'username',
                    message: 'New username:',
                    initial: existing.username || ''
                };
            case 'password':
                return {
                    type: 'password',
                    name: 'password',
                    message: 'New password:'
                };
            default:
                return null;
        }
    }).filter((q) => q !== null);

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
