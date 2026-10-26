import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DirName, FileName } from '@sap-ux/project-access';

/**
 * Rejects adaptation projects before entering the standard manifest-based workflow.
 *
 * @param appPath Root of the application or adaptation project.
 * @throws {Error} Directs adaptation projects to the dedicated tools.
 */
export function assertNotAdaptationProject(appPath: string): void {
    if (existsSync(join(appPath, DirName.Webapp, FileName.ManifestAppDescrVar))) {
        throw new Error(
            'This is a SAP Fiori adaptation project (webapp/manifest.appdescr_variant). ' +
                'The generic list_functionality/get_functionality_details/execute_functionality workflow ' +
                'supports standard Fiori applications, not adaptation projects. ' +
                'For adaptation UI changes, use open_adaptation_editor and run_rta_workflow_step, ' +
                'then adp_controller_extension to fill fragment and controller content. ' +
                'Enable these dedicated tools with SAP_FIORI_MCP_ADP_TOOLS=true if they are unavailable.'
        );
    }
}
