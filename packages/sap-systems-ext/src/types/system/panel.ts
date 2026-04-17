import type { BackendSystem } from '@sap-ux/store';
import type { WebAppActions } from '@sap-ux/sap-systems-ext-types';
import type { SystemPanelViewType } from '../../utils/constants';

export interface PanelContext {
    panelViewType: SystemPanelViewType;
    backendSystem?: BackendSystem;
    systemStatusMessage?: string;
    isGuidedAnswersEnabled: boolean;
    updateBackendSystem: (system: BackendSystem) => void;
    disposePanel: () => void;
    postMessage: (msg: unknown) => Thenable<boolean> | undefined;
}

export type ActionHandler<A> = (context: PanelContext, action: A) => void | Promise<void>;

export type ActionHandlerMap = {
    [T in WebAppActions['type']]: ActionHandler<Extract<WebAppActions, { type: T }>>;
};
