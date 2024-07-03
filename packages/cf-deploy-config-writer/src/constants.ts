import { UI5_DEFAULT } from '@sap-ux/ui5-config';
import { t } from './i18n';

const cannotFindBinary = (bin: string, pkg: string): string => t('error.cannotFindBinary', { bin, pkg });

export const WelcomeFile = 'welcomeFile';
export const XSAppFile = 'xs-app.json';
export const XSSecurityFile = 'xs-security.json';
export const NoAuthType = 'NoAuthentication';
export const MTABuildResult = 'build-result';
export const MTABuildParams = 'build-parameters';
export const MTAFileExtension = 'mta-ext.mtaext';
export const DefaultServiceURL = '${default-url}';
export const ManagedXSUAA = 'managed:xsuaa';
export const SRV_API = 'srv-api';
export const DefaultMTADestination = 'fiori-default-srv-api';
export const EmptyDestination = 'NONE';
export const ResourceMTADestination = '%s-srv-api';
export const MTAYamlFile = 'mta.yaml';
export const RouterModule = 'router';
export const CloudFoundry = 'cf';
export const deployMode = 'deploy_mode';
export const enableParallelDeployments = 'enable-parallel-deployments';
export const CDSExecutable = 'cds';
export const CDSPackage = '@sap/cds-dk';
export const MTAExecutable = 'mta';
export const MTAPackage = 'mta';
export const MTAVersion = '^1.2.27';
export const RimrafVersion = '^5.0.5';
export const Rimraf = 'rimraf';
export const CDSAddMtaParams = ['add', 'mta'];
export const MTAAPIDestination = {
    Name: ResourceMTADestination,
    Type: 'HTTP',
    URL: `~{srv-api/srv-url}`,
    ProxyType: 'Internet',
    Authentication: 'NoAuthentication',
    'HTML5.DynamicDestination': true,
    'HTML5.ForwardAuthToken': true
};
export const UI5Destination = {
    Name: 'ui5',
    Type: 'HTTP',
    URL: UI5_DEFAULT.SAPUI5_CDN,
    ProxyType: 'Internet',
    Authentication: 'NoAuthentication'
};
export const UI5ResourceDestination = {
    'init_data': {
        instance: {
            'existing_destinations_policy': 'update',
            destinations: [
                {
                    Name: 'ui5',
                    Type: 'HTTP',
                    URL: UI5_DEFAULT.SAPUI5_CDN,
                    ProxyType: 'Internet',
                    Authentication: 'NoAuthentication'
                }
            ]
        }
    }
};

export const UI5StandaloneModuleDestination = {
    group: 'destinations',
    properties: {
        forwardAuthToken: false,
        name: 'ui5',
        url: UI5_DEFAULT.SAPUI5_CDN
    }
};

export const DestinationServiceConfig = {
    config: {
        'HTML5Runtime_enabled': true,
        version: '1.0.0',
        ...UI5ResourceDestination
    }
};

export const ServiceAPIRequires = {
    name: SRV_API,
    properties: {
        'srv-url': DefaultServiceURL
    }
};

export const CDSBinNotFound = cannotFindBinary(CDSExecutable, CDSPackage);
export const MTABinNotFound = cannotFindBinary(MTAExecutable, MTAPackage);
export const UI5DeployBuildScript =
    'ui5 build preload --clean-dest --config ui5-deploy.yaml --include-task=generateCachebusterInfo';
export const MTABuildScript = 'rimraf resources mta_archives && mbt build --mtar archive';
export const AppDeployMTAScript = (args: string[] = []): string =>
    `fiori cfDeploy${args.length > 0 ? ` ${args.join(' ')}` : ''}`;
export const RootDeployMTAScript = (args: string[] = []): string =>
    `cf deploy mta_archives/archive.mtar ${args.length > 0 ? `${args.join(' ')} ` : ''}--retries 1`;
export const UndeployMTAScript = (mtaId: string): string =>
    `cf undeploy ${mtaId} --delete-services --delete-service-keys --delete-service-brokers`;
