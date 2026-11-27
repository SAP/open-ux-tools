import fs from 'node:fs';
import { join } from 'node:path';
import type { ToolsLogger } from '@sap-ux/logger';
import { validateEmptyString } from '@sap-ux/project-input-validator';

import type { CfConfig } from '../types.js';
import { t } from '../i18n.js';
import { getCfProjectSpaceGuid, isMtaProject } from './project/yaml.js';

/**
 * Validates the project path for the CF Project Path page.
 *
 * In `existing` mode the path must be an existing MTA project; a missing service definition is no
 * longer an error since the new service-instance dropdown lets the developer bind one. In `new`
 * mode the path is the parent folder in which a new MTA project will be scaffolded, so it only has
 * to exist (the MTA name/uniqueness is validated by the dedicated name prompt).
 *
 * @param {string} projectPath - The path to the project (existing MTA root, or parent folder for new).
 * @param {ToolsLogger} logger - The logger.
 * @param {'new' | 'existing'} [mtaMode] - The selected MTA mode defaults to `existing`.
 * @param {CfConfig} [cfConfig] - The current CF config used to block binding an MTA from a different space.
 * @returns {string | boolean} Returns true if the project path is valid, otherwise returns an error message.
 */
export function validateProjectPath(
    projectPath: string,
    logger: ToolsLogger,
    mtaMode: 'new' | 'existing' = 'existing',
    cfConfig?: CfConfig
): string | boolean {
    const validationResult = validateEmptyString(projectPath);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (!fs.existsSync(projectPath)) {
        return t('error.projectDoesNotExist');
    }

    if (mtaMode === 'new') {
        // New mode scaffolds a new MTA inside the selected folder an already-MTA folder is a conflicting
        // choice (it would nest or silently reuse the MTA), so block it and point the user at Existing mode.
        if (isMtaProject(projectPath)) {
            return t('error.newModeFolderAlreadyMta');
        }
        return true;
    }

    if (!isMtaProject(projectPath)) {
        return t('error.projectDoesNotExistMta');
    }

    // Block reusing an MTA that was created for a different CF space than the current login. The space the
    // MTA targets is persisted in its ui5.yaml an unknown space (non-CF project) is not treated as a mismatch.
    const projectSpaceGuid = getCfProjectSpaceGuid(projectPath, logger);
    if (projectSpaceGuid && cfConfig && projectSpaceGuid !== cfConfig.space.GUID) {
        return t('error.projectSpaceMismatch');
    }

    return true;
}

/**
 * Validates the MTA project name entered when creating a new MTA project.
 *
 * Ensures the name is non-empty, at most 20 characters, uses only allowed characters (letters,
 * numbers, dots, underscores, hyphens; starting with a letter or number) and that no folder with
 * that name already exists in the selected parent location.
 *
 * @param {string} value - The MTA project name to validate.
 * @param {string} [parentPath] - The parent folder the new MTA project will be created in.
 * @returns {string | boolean} Returns true if valid, otherwise an error message.
 */
export function validateMtaId(value: string, parentPath?: string): string | boolean {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (value.length > 20) {
        return t('error.mtaIdTooLong');
    }

    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) {
        return t('error.mtaIdInvalid');
    }

    if (parentPath && fs.existsSync(join(parentPath, value))) {
        return t('error.mtaIdAlreadyExists');
    }

    return true;
}

/**
 * Validate business solution name.
 *
 * @param {string} value - Value to validate.
 * @returns {string | boolean} Validation result.
 */
export function validateBusinessSolutionName(value: string): string | boolean {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (/^[a-z0-9][a-z0-9._-]*$/.test(value)) {
        return true;
    }

    return t('error.businessSolutionNameInvalid');
}
