/**
 * VSCode command identifiers for system related actions.
 */
export enum SystemCommands {
    Create = 'sap.ux.tools.sapSystems.create',
    Show = 'sap.ux.tools.sapSystems.show',
    Delete = 'sap.ux.tools.sapSystems.delete',
    Refresh = 'sap.ux.tools.sapSystems.refresh',
    Import = 'sap.ux.tools.sapSystems.import',
    LaunchAppGen = 'sap.ux.tools.sapSystems.launchAppGen'
}

/**
 * VSCode command identifiers for extension related actions.
 */
export enum ExtensionCommands {
    OpenOutputChannel = 'sap.ux.tools.sapSystems.openOutputChannel'
}

/**
 * The type or mode the panel view is created for.
 * i.e creating a new system, viewing or updating an existing system, or importing a system.
 */
export enum SystemPanelViewType {
    Create,
    View,
    Update,
    Import
}

/**
 * Confirmation prompt types for user actions.
 */
export enum ConfirmationPromptType {
    Overwrite,
    Delete
}

/**
 * Map for the i18n keys for confirmation prompts.
 */
export const confirmationPromptMap = new Map<ConfirmationPromptType, string>([
    [ConfirmationPromptType.Overwrite, 'confirmationPrompt.overwrite'],
    [ConfirmationPromptType.Delete, 'confirmationPrompt.delete']
]);

export const fioriToolsAppModAppGenLaunchCmd = 'sap.ux.appGenerator.launch';
export const launchAppGenCmdType = 'SAP_SYSTEMS_DATA';
