import type { FioriElementsApp } from '../types';
import { TemplateType } from '../types';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { OdataService } from '@sap-ux/odata-service-writer';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { render } from 'ejs';

/**
 * Extend the manifest.json file passed via the fs reference with the template and settings specified.
 * This extends by combining the version specific common manifest with the floorplan/template type
 * specific settings.
 *
 * @param fs - A reference to the in memory file system
 * @param targetPath - The target application path
 * @param rootTemplatesPath - The root path where the manifest templates will be found
 * @param feApp - The applicaiton config to be used by the manifest templates
 */
export function extendManifestJson<T>(
    fs: Editor,
    targetPath: string,
    rootTemplatesPath: string,
    feApp: FioriElementsApp<T>
): void {
    let templatePath = feApp.template.type;
    // FEOP and ALP v4 are variants of LROP and so we use the same template
    if (
        feApp.service.version === OdataVersion.v4 &&
        [
            TemplateType.FormEntryObjectPage,
            TemplateType.AnalyticalListPage,
            TemplateType.ListReportObjectPage,
            TemplateType.Worklist
        ].includes(feApp.template.type)
    ) {
        templatePath = TemplateType.ListReportObjectPage;
    }

    // Enhance template settings
    const templateSettings = {
        ...feApp.template.settings,
        defaultModel: (feApp.service as OdataService).model,
        type: feApp.template.type
    };

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
