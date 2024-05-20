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
    let capUrl;
    let mvnCommand = '';
    // projects by default are served base on the folder name in the app/ folder
    // If the project uses npm workspaces (and specifically cds-plugin-ui5 ) then the project is served using the appId including namespace
    const project = useNPMWorkspaces ? appId : projectName + '/webapp';
    if (capType === CAP_RUNTIME.JAVA) {
        // For Java CAP runtime
        mvnCommand = ' (```mvn spring-boot:run```)';
        capUrl = `http://localhost:8080/${projectName}/webapp/index.html`;
    } else if (capType === undefined || capType === CAP_RUNTIME.NODE_JS) {
            // For Node.js CAP runtime (or if capType is undefined)
        capUrl = `http://localhost:4004/${project}/index.html`;
    }
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


/**
 * Composes the README.md file.
 * @param apply The template writer function.
 * @param readMe The README configuration.
 */
export function composeReadMe(apply: ApplyTemplateFunction, readMeConfig: Partial<ReadMe>): void {

    // Create a complete configuration object for the README.md file with default values
    const config: ReadMe = {
        genDate: readMeConfig?.genDate || new Date().toString(), // Generation date
        genPlatform: readMeConfig?.genPlatform || '', // Generation platform
        dataSourceLabel: readMeConfig?.dataSourceLabel || '', // Data source label
        metadataFilename: readMeConfig?.metadataFilename, // Metadata filename
        serviceUrl: readMeConfig?.serviceUrl || 'N/A', // Service URL
        projectName: readMeConfig?.projectName || '', // Project name
        projectTitle: readMeConfig?.projectTitle || '', // Project title
        projectDescription: readMeConfig?.projectDescription || '', // Project description
        projectNamespace: readMeConfig?.projectNamespace || '', // Project namespace
        ui5Theme: readMeConfig?.ui5Theme || '', // UI5 theme
        projectUI5Version: readMeConfig?.projectUI5Version || '', // UI5 version
        enableCodeAssist: readMeConfig?.enableCodeAssist || false, // Enable code assist
        enableEslint: readMeConfig?.enableEslint || false, // Enable ESLint
        enableTypeScript: readMeConfig?.enableTypeScript || false, // Enable TypeScript
        showMockDataInfo: readMeConfig?.showMockDataInfo || false, // Show mock data info
        genVersion: readMeConfig?.genVersion || '', // Generation version
        templateLabel: readMeConfig?.templateLabel || '', // Template label
        genId: readMeConfig?.genId || '', // Generation ID
        additionalEntries: readMeConfig.additionalEntries || [], // Additional entries (if any)
        launchText: readMeConfig?.launchText || t('TEXT_LAUNCH_DEFAULT') // Launch text (default value if not provided)
    };
    // Apply the configuration to generate the README.md file
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
