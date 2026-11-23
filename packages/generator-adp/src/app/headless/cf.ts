import fs from 'node:fs';
import { join } from 'node:path';

import { getAdpServiceInstances, getModuleNames, hasApprouter } from '@sap-ux/adp-tooling';
import type { CfConfig, CfServiceInstanceChoice } from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../utils/i18n.js';
import { MtaMode } from '../types.js';
import { assertValidationPassed, validateMtaId, validateProjectPath } from '../questions/helper/validators.js';

/**
 * Validates the MTA inputs and resolves the destination project path for the headless CF flow.
 *
 * For `new` MTA mode the folder is created inside `targetFolder` under `mtaId`; for `existing`
 * mode `targetFolder` is the MTA root.
 *
 * @param {MtaMode} mtaMode - The MTA mode.
 * @param {string} targetFolder - The target folder (MTA root for existing, parent for new).
 * @param {ToolsLogger} logger - The logger.
 * @param {CfConfig} cfConfig - The CF configuration.
 * @param {string} [mtaId] - The MTA id/name for new-MTA mode.
 * @returns {string} The resolved absolute project path.
 */
export function resolveCfProjectPath(
    mtaMode: MtaMode,
    targetFolder: string,
    logger: ToolsLogger,
    cfConfig: CfConfig,
    mtaId?: string
): string {
    assertValidationPassed(validateProjectPath(targetFolder, logger, mtaMode, cfConfig));

    if (mtaMode === MtaMode.New) {
        if (!mtaId) {
            throw new Error(t('error.mtaIdRequired'));
        }
        assertValidationPassed(validateMtaId(mtaId, targetFolder));
        return join(targetFolder, mtaId);
    }

    return fs.realpathSync(targetFolder, 'utf-8');
}

/**
 * Whether the target MTA already declares an approuter module. A new MTA never does; for an existing
 * MTA the modules are read from its `mta.yaml`. Mirrors the interactive flow's `detectExistingApprouter`.
 *
 * @param {MtaMode} mtaMode - The MTA mode.
 * @param {string} projectPath - The resolved project/MTA path.
 * @returns {boolean} True if an approuter module already exists.
 */
export function hasExistingApprouter(mtaMode: MtaMode, projectPath: string): boolean {
    if (mtaMode === MtaMode.New) {
        return false;
    }
    try {
        return hasApprouter(getModuleNames(projectPath));
    } catch {
        return false;
    }
}

/**
 * Resolves the live CF service instance to bind and extend, matched by name within the current
 * space. Throws when no instance with that name exists.
 *
 * @param {string} serviceInstanceName - The live service instance name.
 * @param {CfConfig} cfConfig - The CF configuration.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<CfServiceInstanceChoice>} The matched service instance.
 */
export async function resolveCfServiceInstance(
    serviceInstanceName: string,
    cfConfig: CfConfig,
    logger: ToolsLogger
): Promise<CfServiceInstanceChoice> {
    const instances = await getAdpServiceInstances(cfConfig.space.GUID, logger);
    const instance = instances.find((inst) => inst.name === serviceInstanceName);
    if (!instance) {
        throw new Error(t('error.serviceInstanceNotFound', { name: serviceInstanceName }));
    }
    return instance;
}
