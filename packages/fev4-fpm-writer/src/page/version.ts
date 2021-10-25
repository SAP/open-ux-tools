import { join } from 'path';

export function getTemplateRoot(ui5Version?: number): string {
    if (ui5Version === undefined || ui5Version >= 1.94) {
        return join(__dirname, '../../templates/page/1.94');
    } else {
        if (ui5Version < 1.84) {
            throw new Error('SAP Fiori elements for OData v4 is only supported starting with SAPUI5 1.84.');
        } else {
            return join(__dirname, '../../templates/page/1.84');
        }
    }
}
