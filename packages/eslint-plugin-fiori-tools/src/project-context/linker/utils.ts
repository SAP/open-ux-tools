import type { FieldGroupNode } from './annotations';
import type { FeV2ListReport, FeV2ObjectPage, FieldGroup as FieldGroupV2 } from './fe-v2';
import type { FeV4ListReport, FeV4ObjectPage, FieldGroup as FieldGroupV4 } from './fe-v4';

/**
 * Links FieldGroup annotations in List Report pages for Fiori Elements V2 and V4.
 *
 * @param page - The List Report being linked
 * @param fieldGroups - array of Field Group annotations
 */
export function linkListReportFieldGroup(page: FeV2ListReport | FeV4ListReport, fieldGroups: FieldGroupNode[]): void {
    const controls: Record<string, FieldGroupV2 | FieldGroupV4> = {};
    for (const fieldGroup of fieldGroups) {
        const configurationKey = fieldGroup.annotationPath;
        const linkedFieldGroup = {
            type: fieldGroup.type,
            annotation: fieldGroup,
            children: [],
            configuration: {}
        };
        controls[`${linkedFieldGroup.type}|${configurationKey}`] = linkedFieldGroup;
    }
    for (const control of Object.values(controls)) {
        page.lookup[control.type] ??= [];
        (page.lookup[control.type]! as Extract<FieldGroupV2 | FieldGroupV4, { type: typeof control.type }>[]).push(
            control
        );
    }
}

/**
 * Links FieldGroup annotations in Object pages for Fiori Elements V2 and V4.
 *
 * @param page - The object page being linked
 * @param fieldGroups - array of Field Group annotations
 */
export function linkObjectPageFieldGroups(page: FeV2ObjectPage | FeV4ObjectPage, fieldGroups: FieldGroupNode[]): void {
    for (const control of Object.values(fieldGroups)) {
        const linkedFG: FieldGroupV2 | FieldGroupV4 = {
            type: control.type,
            annotation: control,
            configuration: {},
            children: []
        };
        page.fieldGroups.push(linkedFG);

        page.lookup[linkedFG.type] ??= [];
        (page.lookup[linkedFG.type]! as Extract<FieldGroupV2 | FieldGroupV4, { type: typeof linkedFG.type }>[]).push(
            linkedFG
        );
    }
}
