import { UI5_DEFAULT } from '@sap-ux/ui5-config';

export const MTABuildResult = 'build-result';
export const MTABuildParams = 'build-parameters';
export const mtaFileExtension = 'mta-ext.mtaext';
export const DefaultServiceURL = '${default-url}';
export const ManagedXSUAA = 'managed:xsuaa';
export const SRV_API = 'srv-api';
export const DefaultMTADestination = 'fiori-default-srv-api';
export const ResourceMTADestination = '%s-srv-api';
export const MTAYamlFile = 'mta.yaml';
export const RouterModule = 'router';
export const CloudFoundry = 'cf';
export const deployMode = 'deploy_mode';
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
