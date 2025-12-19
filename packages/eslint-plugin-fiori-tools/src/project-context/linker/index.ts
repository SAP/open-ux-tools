import type { Diagnostic } from '../../language/diagnostics';
import type { ParsedProject } from '../parser';
import type { LinkedFeV2App } from './fe-v2';
import { runFeV2Linker } from './fe-v2';
import type { LinkedFeV4App } from './fe-v4';
import { runFeV4Linker } from './fe-v4';
import type { LinkerContext } from './types';

export type LinkedApp = LinkedFeV4App | LinkedFeV2App;

export interface LinkedModel {
    apps: { [path: string]: LinkedApp };
}

/**
 *
 * @param parsedProject
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
            continue;
        }
        // TODO: Report error if both FEv4 and FEv2 pages are detected
    }

    return [model, diagnostics];
}
