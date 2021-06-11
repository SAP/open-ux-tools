import { FrameworkVersion, Template, TemplateType } from './types';

const baseComponents: Record<string, Record<string, string>> = {};
baseComponents[FrameworkVersion.V2] = {};
baseComponents[FrameworkVersion.V2][TemplateType.ListReport] = 'sap/suite/ui/generic/template/lib/AppComponent';
baseComponents[FrameworkVersion.V2][TemplateType.Form] = 'sap/suite/ui/generic/template/lib/AppComponent';
baseComponents[FrameworkVersion.V2][TemplateType.OverviewPage] = 'sap/ovp/app/Component';

baseComponents[FrameworkVersion.V4] = {};
baseComponents[FrameworkVersion.V4][TemplateType.ListReport] = 'sap/fe/core/AppComponent';

/**
 * @param template
 */
export function getBaseComponent(template: Template): string | undefined {
    return baseComponents[template.version][template.type];
}
