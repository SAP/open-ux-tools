import type { PanelContext } from '../../../types/system';
import type { CreateFioriProject, OpenGuidedAnswers } from '@sap-ux/sap-systems-ext-types';
import { commands } from 'vscode';
import { t } from '../../../utils';
import { ExtensionCommands, SystemCommands } from '../../../utils/constants';
import SystemsLogger from '../../../utils/logger';

/**
 * Executes the launch app gen command with the provided system name.
 *
 * @param _context - the panel context (unused)
 * @param action action containing the system name
 */
export const createFioriProject = async (_context: PanelContext, action: CreateFioriProject): Promise<void> => {
    const backendSystem = action.payload.system;
    if (backendSystem) {
        await commands.executeCommand(SystemCommands.LaunchAppGen, backendSystem);
    }
};

/**
 * Opens the output channel for the extension.
 *
 */
export const openOutputChannel = async (): Promise<void> => {
    await commands.executeCommand(ExtensionCommands.OpenOutputChannel);
};

/**
 * Opens the Guided Answers extension.
 *
 * @param _context - the panel context (unused)
 * @param action - open guided answers action containing the command to execute
 */
export const openGuidedAnswers = async (_context: PanelContext, action: OpenGuidedAnswers): Promise<void> => {
    const openGACmd = action.payload.command;

    if (openGACmd?.id) {
        try {
            await commands.executeCommand(openGACmd.id, openGACmd.params);
        } catch (error) {
            SystemsLogger.logger.error(t('error.guidedAnswersCmd', { error }));
        }
    }
};
