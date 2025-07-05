import type { FioriElementsApp, LROPSettings } from '../types';
import { TemplateType } from '../types';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { OdataService } from '@sap-ux/odata-service-writer';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { render } from 'ejs';
import semVer from 'semver';
import type { ManifestEntitySettings } from './types';

/**
 * Extend the manifest.json file passed via the fs reference with the template and settings specified.
 * This extends by combining the version specific common manifest with the floorplan/template type
 * specific settings.
 *
 * @param fs - A reference to the in memory file system
 * @param targetPath - The target application path
 * @param rootTemplatesPath - The root path where the manifest templates will be found
 * @param feApp - The application config to be used by the manifest templates
 */
export function extendManifestJson<T>(
    fs: Editor,
    targetPath: string,
    rootTemplatesPath: string,
    feApp: FioriElementsApp<T>
): void {
    let templatePath = feApp.template.type;
    // FEOP and ALP v4 are variants of LROP and so we use the same template and settings
    if (
        feApp.service.version === OdataVersion.v4 &&
        (
            [
                TemplateType.FormEntryObjectPage,
                TemplateType.AnalyticalListPage,
                TemplateType.ListReportObjectPage,
                TemplateType.Worklist,
                TemplateType.AribaListReportObjectPage
            ] as TemplateType[]
        ).includes(feApp.template.type)
    ) {
        templatePath = TemplateType.ListReportObjectPage;

        // starting with UI5 v1.94.0, contextPath should be used instead of 'entitySet' in manifest for v4 LROP based apps
        const minVersion = semVer.coerce(feApp.ui5?.minUI5Version);
        if (!minVersion || semVer.gte(minVersion, '1.94.0')) {
            const entityConfig = (feApp.template.settings as LROPSettings).entityConfig as ManifestEntitySettings;

            if (entityConfig.mainEntityParameterName) {
                // If the main entity is parameterised, clear the navigation entity configuration
                // as we dont support the navigation entity in this scenario.
                entityConfig.navigationEntity = undefined;
            }

            // Set the contextPath for the main entity
            // If the main entity is parameterised, include the parameter name in the contextPath.
            // Otherwise, use only the main entity name.
            entityConfig.contextPath = entityConfig.mainEntityParameterName
                ? `/${entityConfig.mainEntityName}/${entityConfig.mainEntityParameterName}`
                : `/${entityConfig.mainEntityName}`;

            // Set the contextPath for the navigation entity
            // If the navigation entity exists, append its name to the main entity's contextPath.
            if (entityConfig.navigationEntity?.EntitySet) {
                entityConfig.navigationEntity.contextPath = `${entityConfig.contextPath}/${entityConfig.navigationEntity.Name}`;
            }
        }
    }

    // Enhance template settings
    const templateSettings = {
        ...feApp.template.settings,
        defaultModel: (feApp.service as OdataService).model,
        type: feApp.template.type,
        routingTargetName: 'sap.fe.templates'
    };

    if (feApp.template.type === TemplateType.AribaListReportObjectPage) {
        templateSettings.type = TemplateType.ListReportObjectPage; // the differences between aribaLrop & lrop at this point are too small to warrant further updates to the templates
        templateSettings.routingTargetName = 'sap.fe.ariba';
    }

    // Manifest paths to be extended
    const extendTemplatePaths = [
        join(rootTemplatesPath, 'common', 'extend', 'webapp'),
        join(rootTemplatesPath, templatePath, 'extend', 'webapp'),
        join(rootTemplatesPath, `v${feApp.service.version}`, templatePath, 'extend', 'webapp'),
        join(rootTemplatesPath, `v${feApp.service.version}`, 'common', 'extend', 'webapp')
    ];
    const manifestPath = join(targetPath, 'webapp', 'manifest.json');

    extendTemplatePaths.forEach((extendTemplatePath) => {
        const manifestTemplatePath = join(extendTemplatePath, 'manifest.json');
        if (fs.exists(manifestTemplatePath)) {
            fs.extendJSON(manifestPath, JSON.parse(render(fs.read(manifestTemplatePath), templateSettings, {})));
        }
    });
}
