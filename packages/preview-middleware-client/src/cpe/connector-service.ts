import { ExternalAction, reloadApplication, storageFileChanged } from '@sap-ux-private/control-property-editor-common';
import { ActionSenderFunction, SubscribeFunction } from './types';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../utils/version';

/**
 * A Class of WorkspaceConnectorService
 */
export class WorkspaceConnectorService {
    /**
     * When save and reload is triggered, we do not need special handling for changes that are not directly visible in preview.
     */
    private isReloadPending = false;
    private sendAction: (action: ExternalAction) => void;
    /**
     * Initializes connector service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        this.sendAction = sendAction;
        subscribe((action): void => {
            if (reloadApplication.match(action)) {
                this.isReloadPending = true;
            }
        });

        if (isLowerThanMinimalUi5Version(await getUi5Version(), { major: 1, minor: 73 })) {
            const FakeLrepConnector = (await import('sap/ui/fl/FakeLrepConnector')).default;
            FakeLrepConnector.fileChangeRequestNotifier = this.onChangeSaved.bind(this);
        } else {
            const connector = (await import('open/ux/preview/client/flp/WorkspaceConnector')).default;
            // hook the file deletion listener to the UI5 workspace connector
            connector.storage.fileChangeRequestNotifier = this.onChangeSaved.bind(this);
        }
    }

    private onChangeSaved(fileName: string, kind: 'delete' | 'create', changeType?: string) {
        if (
            (changeType && changeType !== 'appdescr_fe_changePageConfiguration') ||
            kind === 'delete' ||
            this.isReloadPending
        ) {
            this.sendAction(storageFileChanged(fileName?.replace('sap.ui.fl.', '')));
        }
    }
}
