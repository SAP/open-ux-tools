import { MiddlewareConfigs } from '../types';
import { stringify } from 'querystring';
import type { Package } from '@sap-ux/project-access';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import type { PreviewConfigOptions } from '../types';
import type { Editor } from 'mem-fs-editor';
import { satisfies } from 'semver';
import { getPreviewMiddleware, getIntentFromPreviewConfig, isFioriToolsDeprecatedPreviewConfig } from '../common/utils';

/**
 * Get the url parameters needed for the UI5 run time adaptation.
 *
 @param packageJson - package.json file
 * @returns enhanced url parameters
 */
export function getRTAUrlParameters(packageJson: Package): string {
    const getDependencyVersion = (packageJson: Package, dependencyName: string): string | undefined => {
        return packageJson?.devDependencies?.[dependencyName] ?? packageJson?.dependencies?.[dependencyName];
    };

    const parameters: Record<string, string> = {};

    const previewMiddlewareVersion = getDependencyVersion(packageJson, '@sap-ux/preview-middleware');
    const uxUi5ToolingVersion = getDependencyVersion(packageJson, '@sap/ux-ui5-tooling');
    if (
        (previewMiddlewareVersion && satisfies(previewMiddlewareVersion, '<0.16.89')) ??
        (uxUi5ToolingVersion && satisfies(uxUi5ToolingVersion, '<1.15.4')) ??
        (!previewMiddlewareVersion && !uxUi5ToolingVersion)
    ) {
        parameters['fiori-tools-rta-mode'] = 'true';
        parameters['sap-ui-rta-skip-flex-validation'] = 'true';
        parameters['sap-ui-xx-condense-changes'] = 'true';
        parameters['sap-ui-xx-viewCache'] = 'false';
    }
    return stringify(parameters);
}

/**
 * Returns the RTA mount point of the preview middleware configuration from the ui5.yaml file, if given.
 *
 * @param previewMiddlewareConfig - configuration of the preview middleware
 * @returns - RTA mount point or undefined
 */
function getRTAMountPoint(previewMiddlewareConfig: PreviewConfigOptions | undefined): string | undefined {
    let editors =
        previewMiddlewareConfig && 'rta' in previewMiddlewareConfig ? previewMiddlewareConfig?.rta?.editors : undefined; //NOSONAR
    editors ??=
        previewMiddlewareConfig && 'editors' in previewMiddlewareConfig
            ? previewMiddlewareConfig?.editors?.rta?.endpoints
            : undefined;
    if (editors) {
        for (const editor of editors) {
            if (!('developerMode' in editor)) {
                return editor.path;
            }
        }
    }
    return undefined;
}

/**
 * Returns the url for variants management in RTA mode.
 * The url consist of a specified mount point and intent given from the ui5.yaml file as well as parameters for the RTA mode.
 *
 * @param basePath - path to project root, where package.json and ui5.yaml is located
 * @param query - query to create fragment
 * @param yamlFileName - path of the ui5 yaml file
 * @param fs - the memfs editor instance
 * @returns - review url parameters
 */
export async function getRTAUrl(
    basePath: string,
    query: string,
    yamlFileName: string,
    fs?: Editor
): Promise<string | undefined> {
    let previewMiddleware: CustomMiddleware<PreviewConfigOptions> | undefined;
    try {
        previewMiddleware = await getPreviewMiddleware(undefined, basePath, yamlFileName, fs);
    } catch (error) {
        throw new Error(`No ${yamlFileName} file found. ${error}`);
    }

    if (
        previewMiddleware?.name === MiddlewareConfigs.PreviewMiddleware &&
        !getRTAMountPoint(previewMiddleware?.configuration)
    ) {
        return undefined;
    }
    const mountPoint = getRTAMountPoint(previewMiddleware?.configuration) ?? '/preview.html';
    const intent = getIntentFromPreviewConfig(previewMiddleware?.configuration) ?? '#app-preview';
    const queryString = query ? '?' + query : '';

    return isFioriToolsDeprecatedPreviewConfig(previewMiddleware?.configuration)
        ? `${mountPoint}${queryString}#preview-app`
        : `${mountPoint}${queryString}${intent}`;
}
