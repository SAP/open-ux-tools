import { isAppStudio } from '@sap-ux/btp-utils';
import { FileName, getMtaPath, getWebappPath } from '@sap-ux/project-access';
import { DeploymentGenerator, bail, ErrorHandler, ERROR_TYPE } from '@sap-ux/deploy-config-generator-shared';
import { ApiHubType, MtaConfig } from '@sap-ux/cf-deploy-config-writer';
import { join } from 'node:path';
import {
    t,
    DEFAULT_MTA_DESTINATION,
    DESTINATION_CHOICE_NONE,
    DESTINATION_CHOICE_DIRECT_SERVICE_BINDING
} from '../utils';
import type { Manifest } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { CfSystemChoice } from '@sap-ux/cf-deploy-config-inquirer';

/**
 * Get the destination choices from API Hub | Local Store | mta.yaml.
 *
 * @param options - the options required for retrieving the questions.
 * @param options.projectRoot - the root path of the project.
 * @param options.isAbapDirectServiceBinding - whether the destination is an ABAP direct service binding.
 * @param options.cfDestination - the Cloud Foundry destination.
 * @param options.isCap - whether the project is a CAP project.
 * @param options.apiHubConfigType - the API Hub configuration.
 * @returns the cf deploy config questions.
 */
export async function getCFChoices({
    projectRoot,
    isAbapDirectServiceBinding,
    cfDestination,
    isCap,
    apiHubConfigType
}: {
    projectRoot: string;
    isAbapDirectServiceBinding: boolean;
    cfDestination: string;
    isCap: boolean;
    apiHubConfigType?: string;
}): Promise<CfSystemChoice[]> {
    let choices: CfSystemChoice[] = [];
    const abapBindingChoice = [
        {
            name: t('cfGen.prompts.abapBinding.name'),
            value: DESTINATION_CHOICE_DIRECT_SERVICE_BINDING
        }
    ];

    // If API Hub Enterprise configuration is used, return the CF destination
    if (apiHubConfigType === ApiHubType.apiHubEnterprise) {
        choices = [
            {
                name: cfDestination,
                value: cfDestination
            }
        ];
    } else {
        const cfChoices =
            !isAbapDirectServiceBinding && isAppStudio()
                ? await getCFSystemChoices(projectRoot, isCap, cfDestination)
                : [];
        choices = isAbapDirectServiceBinding ? abapBindingChoice : cfChoices;
    }
    return choices;
}

/**
 * Generate a systems choice list.
 *
 * @param projectRoot - the root path of the project.
 * @param isCap - whether the project is a CAP project.
 * @param cfDestination - the Cloud Foundry destination.
 * @returns the cf deploy config questions.
 */
async function getCFSystemChoices(
    projectRoot: string,
    isCap: boolean,
    cfDestination?: string
): Promise<CfSystemChoice[]> {
    const choices: CfSystemChoice[] = [];
    try {
        let mtaDestinations: string[] = [];
        // Append mta destinations to support instance based destination flows
        if (isCap) {
            const mtaConfig = await MtaConfig.newInstance(projectRoot);
            mtaDestinations = mtaConfig.getExposedDestinations();
            if (mtaDestinations?.length) {
                // Add default option
                choices.push({
                    name: t('cfGen.prompts.capInstanceBasedDest.name'),
                    value: DEFAULT_MTA_DESTINATION
                });
            }
        } else {
            const mtaResult = await getMtaPath(projectRoot);
            const mtaDir = mtaResult?.mtaPath?.split(FileName.MtaYaml)[0];
            if (mtaDir) {
                const mtaConfig = await MtaConfig.newInstance(mtaDir);
                mtaDestinations = mtaConfig.getExposedDestinations(true);
            }
        }

        // Add MTA destinations
        if (mtaDestinations?.length) {
            // Load additional destinations exposed by the mta.yaml
            mtaDestinations.forEach((dest) => {
                choices.push({
                    name: t('cfGen.prompts.instanceBasedDest.name', { destination: dest }),
                    value: dest
                });
            });
        }
    } catch (error) {
        DeploymentGenerator.logger?.debug(t('cfGen.error.mtaDestinations', { error }));
    }

    if (!cfDestination) {
        choices.splice(0, 0, { name: t('cfGen.prompts.none.name'), value: DESTINATION_CHOICE_NONE });
    }
    return choices;
}

/**
 * Determines the default option for the destination question based on the project environment.
 *
 * @param isAbapDirectServiceBinding - Indicates if ABAP direct service binding is used.
 * @param isBAS - Whether the environment is SAP Business Application Studio (BAS).
 * @param cfDestination - The pre-configured Cloud Foundry destination (if available).
 * @returns {string} The default destination option.
 */
export function destinationQuestionDefaultOption(
    isAbapDirectServiceBinding: boolean,
    isBAS: boolean,
    cfDestination?: string
): string {
    let defaultDestination = '';

    if (!isBAS) {
        defaultDestination = cfDestination ?? '';
    } else if (cfDestination) {
        defaultDestination = cfDestination;
    } else if (isAbapDirectServiceBinding) {
        defaultDestination = DESTINATION_CHOICE_DIRECT_SERVICE_BINDING;
    } else if (isBAS) {
        defaultDestination = DESTINATION_CHOICE_NONE;
    }

    return defaultDestination;
}

/**
 * Load the manifest file from the project.
 *
 * @param fs - editor instance
 * @param appPath - path to the project
 * @returns manifest object
 */
export async function loadManifest(fs: Editor, appPath: string): Promise<Manifest | undefined> {
    const manifestPath = join(await getWebappPath(appPath), FileName.Manifest);
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;

    if (!manifest) {
        bail(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_MANIFEST));
    }

    if (!manifest['sap.app']?.id) {
        bail(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_APP_NAME));
    }

    return manifest;
}
