import { ExternalAction, storageFileChanged } from '@sap-ux-private/control-property-editor-common';
import { ActionSenderFunction } from './types';
import VersionInfo from 'sap/ui/VersionInfo';

/**
 * A Class of WorkspaceConnectorService
 */
export class WorkspaceConnectorService {
    /**
     * Initializes connector service.
     *
     * @param sendAction action sender function
     */
    public async init(sendAction: ActionSenderFunction): Promise<void> {
        const { version } = (await VersionInfo.load()) as { version: string };
        const versionParts = version.split('.');
        const minor = parseInt(versionParts[1], 10);
        if (minor > 72) {
            const connector = (await import('open/ux/preview/client/flp/WorkspaceConnector')).default;
            // hook the file deletion listener to the UI5 workspace connector
            connector.storage.fileChangeRequestNotifier = notifier(sendAction);
        } else {
            const FakeLrepConnector = (await import('sap/ui/fl/FakeLrepConnector')).default;
            FakeLrepConnector.fileChangeRequestNotifier = notifier(sendAction);
        }
    }
}

function notifier(sendAction: (action: ExternalAction) => void) {
    return (fileName: string, kind: 'delete' | 'create', changeType?: string) => {
        if ((changeType && changeType !== 'appdescr_fe_changePageConfiguration') || kind === 'delete') {
            sendAction(storageFileChanged(fileName?.replace('sap.ui.fl.', '')));
        }
    };
}
