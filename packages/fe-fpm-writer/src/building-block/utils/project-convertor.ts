import { ApplicationStructure, Project, ServiceSpecification } from '@sap-ux/project-access';
import { dirname, join, relative } from 'path';

interface ApplicationStructureTemp extends ApplicationStructure {
    mainService: string;
    annotations: { [serviceIndex: string]: string[] };
}

export interface ProjectTemp extends Project {
    apps: { [index: string]: ApplicationStructureTemp };
    type: string;
    mainService: string;
}

enum DirName {
    Sapux = 'src',
    Schemas = '.schemas',
    Pages = 'pages',
    Webapp = 'webapp',
    Temp = '.tmp',
    Changes = 'changes',
    LocalService = 'localService',
    Controller = 'controller',
    View = 'view',
    Fragment = 'fragment',
    Ext = 'ext',
    VSCode = '.vscode',
    AppConfig = 'appconfig',
    Db = 'db',
    Csv = 'csv',
    Data = 'data',
    Mockdata = 'mockdata',
    Dist = 'dist'
}

enum FileName {
    Manifest = 'manifest.json',
    App = 'app.json',
    Package = 'package.json',
    ServiceMetadata = 'metadata.xml',
    NeoApp = 'neo-app.json',
    Pom = 'pom.xml',
    Fragment = 'fragment.xml',
    LaunchConfig = 'launch.json',
    ServiceCds = 'services.cds',
    IndexCds = 'index.cds',
    Ui5Yaml = 'ui5.yaml',
    Ui5LocalYaml = 'ui5-local.yaml',
    Ui5MockYaml = 'ui5-mock.yaml',
    Ui5DeployYaml = 'ui5-deploy.yaml',
    fioriSandboxConfig = 'fioriSandboxConfig.json',
    View = 'view.xml',
    ExtConfigJson = '.extconfig.json',
    ManifestAppDescrVar = 'manifest.appdescr_variant',
    TsConfigJson = 'tsconfig.json',
    DotLibrary = '.library'
}

/**
 * Convert absolute path to relative path. If target is empty, return empty string.
 *
 * @param source - source path
 * @param target - target path
 * @returns - relative path from source to target
 */
const relPath = (source: string, target: string): string => {
    if (target === '') {
        return '';
    }
    return relative(source, target);
};

/**
 * Convert services from new @sap-ux/project-access format to old format.
 *
 * @param root - root
 * @param relWebappPath - relative path to webapp folder
 * @param services - services of the project in new @sap-ux/project-access format
 * @returns - services of the project in old format
 */
const convertServices = (
    root: string,
    relWebappPath: string,
    services: { [index: string]: ServiceSpecification }
): {
    [index: string]: ServiceSpecification;
} => {
    const result: { [index: string]: ServiceSpecification } = {};
    for (const service in services) {
        let annotations;
        const annotation = Array.isArray(services[service].annotations)
            ? services[service].annotations?.find(
                  (annotation) =>
                      typeof annotation.local === 'string' &&
                      typeof annotation.uri === 'string' &&
                      relPath(join(root, relWebappPath), annotation.local) !== join(annotation.uri)
              )
            : undefined;
        if (annotation) {
            annotations = [
                {
                    uri: annotation.uri,
                    local: relPath(root, annotation.local!)
                }
            ];
        }
        result[service] = {
            uri: services[service].uri,
            local: relPath(root, services[service]?.local!),
            annotations,
            odataVersion: services[service].odataVersion
        };
    }
    return result;
};

export function getAppConfig(project: Project, appId?: string): ApplicationStructure {
    if (appId === undefined) {
        const appIds = Object.keys(project.apps);
        return project.apps[appIds[0]];
    } else {
        const app = project.apps[appId];
        if (!app) {
            throw new Error('ERROR_INVALID_APP_ID');
        }
        return app;
    }
}

const convertAnnotations = (
    root: string,
    services: { [index: string]: ServiceSpecification }
): { [serviceIndex: string]: string[] } => {
    const result: { [serviceIndex: string]: string[] } = {};
    for (const service in services) {
        const annotations = services[service].annotations;
        if (Array.isArray(annotations)) {
            for (const annotation of annotations) {
                if (typeof annotation.local === 'string') {
                    result[service] ??= [];
                    result[service].push(relPath(root, annotation.local));
                }
            }
        }
    }
    return result;
};

/**
 * Convert project from @sap-ux/project-access to project from 'fiori-annotation-api'
 * getProject() and converts it to the old structure.
 *
 * @param project - project from @sap-ux/project-access
 * @returns - project structure
 */
export const convertProject = async (project: Project, appId: string): Promise<ProjectTemp> => {
    const app = getAppConfig(project, appId);
    const convertedProject: ProjectTemp = {
        root: project.root,
        apps: {},
        type: ['CAPJava', 'CAPNodejs'].includes(project.projectType) ? 'Cap' : 'Edmx',
        projectType: project.projectType,
        mainService: app.mainService ?? 'mainService'
    };

    for (const app in project.apps) {
        const relWebappPath = relPath(project.root, dirname(project.apps[app].manifest));
        convertedProject.apps[app] = {
            manifest: relPath(project.root, project.apps[app].manifest),
            changes: relPath(project.root, project.apps[app].changes),
            appRoot: join(app, DirName.Sapux, FileName.App),
            mainService: project.apps[app].mainService ?? 'mainService',
            services: convertServices(project.root, relWebappPath, project.apps[app].services),
            i18n: { 'sap.app': '', models: {} },
            annotations: convertAnnotations(project.root, project.apps[app].services)
        };
    }
    return convertedProject;
};
