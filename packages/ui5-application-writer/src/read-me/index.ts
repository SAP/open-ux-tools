import { ApplyTemplateFunction, ReadMe, CAP_RUNTIME, TemplateWriter } from './types';
import { t } from '../i18n';
import { join } from 'path';
import { Editor } from 'mem-fs-editor';
import { type CapRuntime } from '@sap-ux/odata-service-inquirer';
import { DatasourceType } from '@sap-ux/odata-service-inquirer';

/**
 * Returns a function that writes a template to the file system.
 * @param fileName The name of the file to write.
 * @param destPath The destination path to write the file to.
 * @param fsEditor The file system editor.
 * @returns The function that writes the template to the file system.
 */
function getTemplateWriter({ fileName, destPath, fsEditor}: TemplateWriter): ApplyTemplateFunction {
    // We have different relative template paths depending on if the code is bundled (prod) or not not (test)
    // todo: make the paths the same relatively so this is not necessary (or have a mapping in webpack)
    let bundledPath = false;
    if (fsEditor.exists(join(__dirname, '..', 'templates', fileName))) {
        bundledPath = true;
    }
    return <P>(path: string, properties: P): void => {
        fsEditor.copyTpl(
            join(__dirname, `${bundledPath ? '' : '..'}`, '..', 'templates', path),
            join(destPath, path.replace(/\.tmpl|-cap-tmpl/g, '')),
            properties!
        );
    };
}

/**
 * Generates a launch text for the launching of applications.
 * @param capType The type of CAP runtime used in the application will be provided for CAP applications.
 * @param projectName The name of the project.
 * @param appId The ID of the application.
 * @param useNPMWorkspaces Specifies whether the project uses npm workspaces. Defaults to false.
 * @returns The launch text for the application.
 */
export function getLaunchText(capType: CapRuntime | undefined, projectName: string, appId: string, useNPMWorkspaces: boolean = false): string {
    function getCapUrl(): string {
        const project = useNPMWorkspaces ? appId : projectName + '/webapp';
        if (capType === CAP_RUNTIME.JAVA) {
            return `http://localhost:8080/${projectName}/webapp/index.html`;
        } else if (capType === undefined || capType === CAP_RUNTIME.NODE_JS) {
            return `http://localhost:4004/${project}/index.html`;
        }
        return '';
    }

    let mvnCommand = '';
    if (capType === CAP_RUNTIME.JAVA) {
        mvnCommand = ' (```mvn spring-boot:run```)';
    }
    const capUrl = getCapUrl();
    return `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`;
}

/**
 * Generates a label for the data source to be written into read me.
 * @param source The type of data source.
 * @param systemType The type of system associated with the data source.
 * @param isApiEnterpriseType Indicates whether the data source is an enterprise API.
 * @returns The generated data source label.
 */
export function getDataSourceLabel(source: DatasourceType, systemType: string = '', isApiEnterpriseType: boolean = false): string {
    if (source === DatasourceType.sapSystem) {
        // Label for SAP system data source
        const labelDatasourceType = t(`README_LABEL_DATASOURCE_TYPE_${DatasourceType.sapSystem}`);
        const labelSystemType = t(`LABEL_SAP_SYSTEM_SOURCE_TYPE_${systemType}`);
        return `${labelDatasourceType} (${labelSystemType})`;
    } else if ( source === DatasourceType.businessHub && isApiEnterpriseType) {
        // Label for API business hub enterprise type data source
       return t('LABEL_API_BUSINESS_HUB_ENTERPRISE');
    }
    // Default label for other data source types
    return t(`README_LABEL_DATASOURCE_TYPE_${source}`)
}

function mergeWithDefaults(readMeConfig: Partial<ReadMe>): ReadMe {
    const defaults: ReadMe = {
        genDate: new Date().toString(),
        genPlatform: '',
        dataSourceLabel: '',
        metadataFilename: '',
        serviceUrl: 'N/A',
        projectName: '',
        projectTitle: '',
        projectDescription: '',
        projectNamespace: '',
        ui5Theme: '',
        projectUI5Version: '',
        enableCodeAssist: false,
        enableEslint: false,
        enableTypeScript: false,
        showMockDataInfo: false,
        genVersion: '',
        templateLabel: '',
        genId: '',
        additionalEntries: [],
        launchText: t('TEXT_LAUNCH_DEFAULT')
    };

    return { ...defaults, ...readMeConfig };
}

/**
 * Composes the README.md file.
 * @param apply The template writer function.
 * @param readMe The README configuration.
 */
export function composeReadMe(apply: ApplyTemplateFunction, readMeConfig: Partial<ReadMe>): void {
    // Apply the configuration to generate the README.md file
    const config: ReadMe = mergeWithDefaults(readMeConfig);
    apply<ReadMe>('README.md', config);
}

/**
 * Exposed readMe generator API, for use until open source ux-tools provides
 * @param fs
 * @param param1
 */
export function generateReadMe(destPath: string, readMeConfig: Partial<ReadMe>, fs: Editor): Editor {
    composeReadMe(getTemplateWriter({ fileName: 'README.md', destPath, fsEditor: fs }), readMeConfig);
    return fs;
}

export { ReadMe }
