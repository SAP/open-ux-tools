import { validateVersion } from '../common/version';
import { join } from 'path';

export function getTemplateRoot(ui5Version?: number): string {
    validateVersion(ui5Version);
    if (ui5Version === undefined || ui5Version >= 1.94) {
        return join(__dirname, '../../templates/page/1.94');
    } else {
        return join(__dirname, '../../templates/page/1.84');
    }
}
