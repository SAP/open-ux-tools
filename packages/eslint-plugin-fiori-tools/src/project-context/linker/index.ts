import type { Diagnostic } from '../../language/diagnostics.js';
import type { ParsedProject } from '../parser/index.js';
import type { LinkedFeV2App } from './fe-v2.js';
import { runFeV2Linker } from './fe-v2.js';
import type { LinkedFeV4App } from './fe-v4.js';
import { runFeV4Linker } from './fe-v4.js';
import type { LinkerContext } from './types.js';

export type LinkedApp = LinkedFeV4App | LinkedFeV2App;

export interface LinkedModel {
    apps: { [path: string]: LinkedApp };
}

/**
 * Links the parsed project structure to create a resolved model.
 * Determines FE version (v2 or v4) and creates appropriate linked structure.
 *
 * @param parsedProject - Parsed project containing applications and services
 * @returns Tuple of [LinkedModel, Diagnostic[]] with linked model and any diagnostics
 */
export function linkProject(parsedProject: ParsedProject): [LinkedModel, Diagnostic[]] {
    const model: LinkedModel = {
        apps: {}
    };
    const diagnostics: Diagnostic[] = [];
    for (const [appRoot, app] of Object.entries(parsedProject.apps)) {
        const linkerContext: LinkerContext = {
            app,
            diagnostics
        };

        const linkedFeV4App = runFeV4Linker(linkerContext);
        const linkedFeV2App = runFeV2Linker(linkerContext);

        if (linkedFeV2App.pages.length > 0 && linkedFeV4App.pages.length === 0) {
            model.apps[appRoot] = linkedFeV2App;
            continue;
        }
        if (linkedFeV4App.pages.length > 0 && linkedFeV2App.pages.length === 0) {
            model.apps[appRoot] = linkedFeV4App;
        }
        // NOSONAR - TODO: Report error if both FEv4 and FEv2 pages are detected
    }

    return [model, diagnostics];
}
