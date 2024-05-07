import { toReferenceUri } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import { t } from '../i18n';
import { join } from 'path';
import { type CapService } from '../types/capTypes';
import { getAnnotationPath } from '@sap-ux/fiori-generator-shared';
import type { Logger } from '@sap-ux/logger';
import { toPosixPath } from './helpers';

/**
 * Updates either the index.cds or services.cds file with the provided annotation configuration.
 * If neither file exists, a new services.cds file is created with the annotation configuration.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} annotationConfig - The annotation configuration to append to the file.
 * @param {CapService} capService - The CAP service configuration.
 */
async function updateCdsIndexOrServiceFile(fs: Editor, annotationConfig: string, capService: CapService) {
    const indexFile = join(capService.projectPath, capService.appPath ?? '', 'index.cds');
    const serviceFile = join(capService.projectPath, capService.appPath ?? '', 'services.cds');

    if (fs.exists(indexFile)) {
        fs.append(indexFile, annotationConfig);
    } else if (fs.exists(serviceFile)) {
        fs.append(serviceFile, annotationConfig);
    } else {
        fs.write(serviceFile, annotationConfig);
    }
}

/**
 * Generates the annotation configuration string for a given project name.
 * This configuration string is used to import annotations from the project's 'annotations' directory.
 *
 * @param {string} projectName - The name of the project.
 * @returns {string} The annotation configuration string.
 */
function generateAnnotationConfig(projectName: string): string {
    return `\nusing from './${toPosixPath(join(projectName, 'annotations'))}';`;
}

/**
 * Writes the annotation CDS file with a given service name and service CDS path.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} annotationCdsPath - The path to the annotation CDS file.
 * @param {string} serviceName - The name of the service.
 * @param {string} serviceCdsPath - The path to the service CDS file.
 */
async function writeAnnotationCdsFile(
    fs: Editor,
    annotationCdsPath: string,
    serviceName: string,
    serviceCdsPath: string
) {
    fs.write(annotationCdsPath, `using ${serviceName} as service from '${serviceCdsPath}';`);
}

/**
 * Updates CAP CDS files by adding annotation references.
 *
 * @param {Editor} fs - The file system editor.
 * @param {CapService} capService - The CAP service configuration.
 * @param {string} projectName - The name of the project.
 * @param {Logger} [logger] - The logger instance for logging messages.
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 */
export async function updateCdsFilesWithAnnotations(
    fs: Editor,
    capService: CapService,
    projectName: string,
    logger?: Logger
): Promise<void> {
    const annotationPath = getAnnotationPath(projectName, capService?.appPath);
    const serviceCdsPath = await toReferenceUri(
        capService.projectPath,
        annotationPath,
        capService.serviceCdsPath ?? ''
    );
    const annotationConfig = generateAnnotationConfig(projectName);
    const annotationCdsPath = join(capService.projectPath, capService.appPath ?? '', projectName, 'annotations.cds');
    logger?.info(t('info.capServiceName', { capServiceName: capService.serviceName }));
    logger?.info(
        t('info.cdsUpdateInfo', {
            projectPath: {
                root: capService.projectPath
            },
            annotationPath: annotationPath,
            capService: capService
        })
    );
    await writeAnnotationCdsFile(fs, annotationCdsPath, capService.serviceName, serviceCdsPath);
    await updateCdsIndexOrServiceFile(fs, annotationConfig, capService);
}
