import { App, Package, UI5 } from './types';
import mappings from './version-to-descriptor-mapping.json'; // from https://github.com/SAP/ui5-manifest/blob/master/mapping.json

export function packageDefaults(version?: string): Partial<Package> {
    return {
        version: version || '0.9.0',
        description: '',
        devDependencies: {
            '@ui5/cli': '^2.8.1'
        },
        scripts: {
            start: 'ui5 serve --config=ui5.yaml --open index.html',
            build: 'ui5 build --config=ui5.yaml --clean-dest --dest dist'
        }
    };
}

export function appDefaults(appId: string): Partial<App> {
    return {
        version: '0.9.0',
        uri: appId.replace('.', '/'),
        title: `Title of ${appId}`,
        description: `Description of ${appId}`,
        baseComponent: 'sap/ui/core/UIComponent'
    };
}

export function mergeUi5(ui5?: UI5): UI5 {
    const merged: Partial<UI5> = {
        minVersion: ui5?.minVersion || '1.60',
        version: ui5?.version || '1.84.0'
    };
    merged.descriptorVersion =
        ui5?.descriptorVersion || (mappings as Record<string, string>)[merged.minVersion!] || '1.12.0';
    return merged as UI5;
}
