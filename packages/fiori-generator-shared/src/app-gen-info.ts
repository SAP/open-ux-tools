import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { AbapCSN, AppGenInfo, ExternalParameters } from './types';

/**
 * Transforms the external abapCSN object (possible multiple services) to the internal abapCSN (single chosen service).
 * Uses the chosen service to obtain the service uri and name for the .appGenInfo.json.
 *
 * @param chosenService - the service selected during prompting
 * @param chosenService.serviceId - service id
 * @param chosenService.serviceUrl - service url
 * @param abapCSN - external abapCSN object passed to app gen
 * @returns - internal representation of abapCSN for .appGenInfo.json
 */
export function transformAbapCSNForAppGenInfo(
    { serviceId, serviceUrl }: { serviceId?: string; serviceUrl?: string },
    abapCSN: AbapCSN
): {
    packageUri: string;
    csnName: string;
    serviceNameCsn?: string;
    serviceUri?: string;
}[] {
    const serviceUrlObj = serviceUrl ? new URL(serviceUrl) : undefined;
    // adds trailing '/' to match to mainService.uri in manifest.json
    const serviceUri = serviceUrlObj?.pathname?.endsWith('/')
        ? serviceUrlObj.pathname
        : (serviceUrlObj?.pathname ?? '') + '/';
    const serviceNameCsn = abapCSN.services.find((s) => s.runtimeName.toUpperCase() === serviceId)?.csnServiceName;

    return [
        {
            packageUri: abapCSN.packageUri,
            csnName: abapCSN.csnName,
            serviceNameCsn,
            serviceUri
        }
    ];
}

/**
 * Generates a README file and .appGenInfo.json at the specified destination path using the provided configuration and file system editor.
 *
 * @param {string} destPath - the desitination path where the info fileswill be created.
 * @param {AppGenInfo} appGenInfo - the configuration object containing the details to be included in the info files.
 * @param {Editor} fs - the file system editor instance used to write the info files.
 * @returns {Editor} the file system editor instance used to write the info files.
 */
export function generateAppGenInfo(destPath: string, appGenInfo: AppGenInfo, fs: Editor): Editor {
    // N.B. This function must stay at this level in the directory structure, i.e one level below 'templates'
    // Apply the configuration to generate the README file
    const templateSourcePath = join(__dirname, '../templates/README.md');
    const templateDestPath = `${destPath}/README.md`;

    const { externalParameters, serviceId, ...appGenInfoCore } = appGenInfo;

    // Write the README file
    fs.copyTpl(templateSourcePath, templateDestPath, appGenInfoCore);

    const appGenInfoJson: {
        generationParameters: Exclude<AppGenInfo, 'externalParameters'>;
        externalParameters?: ExternalParameters;
    } = {
        generationParameters: appGenInfoCore
    };

    if (externalParameters) {
        if (externalParameters.abapCSN) {
            externalParameters.abapCSN = transformAbapCSNForAppGenInfo(
                { serviceId, serviceUrl: appGenInfo.serviceUrl },
                externalParameters.abapCSN as AbapCSN
            );
        }
        appGenInfoJson.externalParameters = externalParameters;
    }

    // Write the .appGenInfo.json file
    fs.writeJSON(`${destPath}/.appGenInfo.json`, appGenInfoJson);

    return fs;
}
