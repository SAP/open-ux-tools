import { join } from 'path';
import { ui5Libs } from './constants';
import propertiesReader from 'properties-reader';
import { Manifest } from '../types';

export function getLibraryDesc(library: any, projectPath: string): string {
    const libraryDesc = library?.library?.documentation;
    if (typeof libraryDesc === 'string' && libraryDesc.startsWith('{{')) {
        const desc = libraryDesc.replace(/(^{{)|(}}$)/g, '');
        return getI18nProperty(join(projectPath, library.library.appData.manifest.i18n.toString()), desc).toString();
    }
    return libraryDesc.toString();
}

export function getLibraryDependencies(library: any): string[] {
    const result: string[] = [];
    if (library?.library?.dependencies?.dependency) {
        let deps = library.library.dependencies.dependency;
        if (!Array.isArray(deps)) {
            deps = [deps];
        }
        deps.forEach((lib: { libraryName: string }) => {
            // ignore libs that start with SAPUI5 delivered namespaces
            if (
                !ui5Libs.some((substring) => {
                    return lib.libraryName === substring || lib.libraryName.startsWith(substring + '.');
                })
            ) {
                result.push(lib.libraryName);
            }
        });
    }
    return result;
}

function getI18nProperty(i18nPath: string, property: string): string {
    try {
        const libProperties = propertiesReader(i18nPath);
        return libProperties.get(property)?.toString() || '';
    } catch (e) {
        return '';
    }
}

export function getManifestDesc(manifest: Manifest, projectPath: string): string {
    const manifestDesc = manifest['sap.app']?.description;
    if (typeof manifestDesc === 'string' && manifestDesc.startsWith('{{')) {
        const desc = manifestDesc.replace(/(^{{)|(}}$)/g, '');
        return getI18nProperty(join(projectPath, manifest['sap.app']?.i18n?.toString()), desc).toString();
    }

    return (manifestDesc || '').toString();
}

export function getManifestDependencies(manifest: Manifest): string[] {
    const result: string[] = [];
    Object.values(['libs', 'components']).forEach((reuseType) => {
        if (manifest['sap.ui5']?.dependencies?.[reuseType]) {
            Object.keys(manifest['sap.ui5'].dependencies['libs']).forEach((manifestLibKey) => {
                // ignore libs that start with SAPUI5 delivered namespaces
                if (
                    !ui5Libs.some((substring) => {
                        return manifestLibKey === substring || manifestLibKey.startsWith(substring + '.');
                    })
                ) {
                    result.push(manifestLibKey);
                }
            });
        }
    });

    return result;
}
