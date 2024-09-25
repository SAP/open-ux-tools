import type { ReactElement } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { UIDialog, UILink, UIToggle } from '@sap-ux/ui-components';
import type { Scenario, ShowMessage } from '@sap-ux-private/control-property-editor-common';
import { LeftPanel, RightPanel } from './panels';
import { Toolbar } from './toolbar';
import { useLocalStorage } from './use-local-storage';
import type { RootState } from './store';
import { useAppDispatch } from './store';
import { changePreviewScale } from './slice';
import { useWindowSize } from './use-window-size';
import { DEFAULT_DEVICE_WIDTH, DEVICE_WIDTH_MAP } from './devices';

import './App.scss';
import './Workarounds.scss';

export interface AppProps {
    previewUrl: string;
    scenario: Scenario;
}

/**
 * React element for App.
 *
 * @param appProps - AppProps
 * @returns ReactElement
 */
export default function App(appProps: AppProps): ReactElement {
    const { previewUrl, scenario } = appProps;

    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const isAdpProject = useSelector<RootState, boolean>((state) => state.isAdpProject);

    useEffect(() => {
        const sheet = window.document.styleSheets[0];
        sheet.insertRule(
            '@font-face {font-family: "SAP-icons"; src: url("/resources/sap/ui/core/themes/base/fonts/SAP-icons.woff2") format("woff2"),' +
                'local("SAP-icons"); font-weight: normal; font-style: normal}',
            sheet.cssRules.length
        );
    }, []);

    const [hideWarningDialog, setHideWarningDialog] = useLocalStorage('hide-warning-dialog', false);
    const [isWarningDialogVisible, setWarningDialogVisibility] = useState(() => hideWarningDialog !== true);
    const [shouldShowDialogMessage, setShouldShowDialogMessage] = useState(false);
    const [shouldHideIframe, setShouldHideIframe] = useState(false);

    const [isInitialized, setIsInitialized] = useState(false);

    const previewWidth = useSelector<RootState, string>(
        (state) => `${DEVICE_WIDTH_MAP.get(state.deviceType) ?? DEFAULT_DEVICE_WIDTH}px`
    );
    const previewScale = useSelector<RootState, number>((state) => state.scale);
    const fitPreview = useSelector<RootState, boolean>((state) => state.fitPreview ?? false);
    const windowSize = useWindowSize();
    const dialogMessage = useSelector<RootState, ShowMessage | undefined>((state) => state.dialogMessage);
    const [dialogQueue, setDialogQueue] = useState<ShowMessage[]>([]);
    const [suppressDialog, setSuppressDialog] = useState<boolean>(false);
    const containerRef = useCallback(
        (node) => {
            if (node === null) {
                return;
            }
            setTimeout(() => {
                if (isInitialized && !fitPreview) {
                    return;
                }
                const paddingWidth = 40;
                const width = node.clientWidth;
                const availableWidth = width - paddingWidth;
                const requiredWidth = parseInt(previewWidth, 10);
                if (availableWidth < requiredWidth) {
                    const scale = availableWidth / requiredWidth;
                    dispatch(changePreviewScale(scale));
                    const startPosition = (node.scrollWidth - width) / 2;
                    if (typeof node.scrollTo === 'function') {
                        node.scrollTo(startPosition, 0);
                    }
                } else if (previewScale < 1 && availableWidth >= requiredWidth) {
                    dispatch(changePreviewScale(1));
                }
                if (!isInitialized) {
                    setIsInitialized(true);
                }
            }, 0);
        },
        [windowSize, fitPreview]
    );

    function closeWarningDialog(): void {
        setWarningDialogVisibility(false);
    }

    const closeAdpWarningDialog = (): void => {
        setDialogQueue((prevQueue) => prevQueue.slice(1));
        setShouldShowDialogMessage(dialogQueue.length !== 0);
        setSuppressDialog(true);
    };

    useEffect(() => {
        if (dialogMessage && isAdpProject) {
            setShouldShowDialogMessage(true);
            setShouldHideIframe(dialogMessage.shouldHideIframe);
            setDialogQueue((prevQueue) => [...prevQueue, dialogMessage]);
        }
    }, [dialogMessage, isAdpProject]);

    return (
        <div className="app-container">
            <Toolbar />
            <div className="app">
                <section className="app-panel app-panel-left">
                    <LeftPanel />
                </section>
                <section ref={containerRef} className="app-content">
                    <div className="app-canvas">
                        {!shouldHideIframe && (
                            <iframe
                                className="app-preview"
                                id="preview"
                                style={{
                                    width: previewWidth,
                                    transform: `scale(${previewScale})`
                                }}
                                src={previewUrl}
                                title={t('APPLICATION_PREVIEW_TITLE')}
                            />
                        )}
                    </div>
                </section>
                <section className="app-panel app-panel-right">
                    <RightPanel />
                </section>
                {isAdpProject && shouldHideIframe && dialogQueue.length > 0 && (
                    <UIDialog
                        hidden={!shouldShowDialogMessage}
                        dialogContentProps={{
                            title: t('TOOL_DISCLAIMER_TITLE'),
                            subText: dialogQueue[0]?.message
                        }}
                    />
                )}
                {isAdpProject && !shouldHideIframe && dialogQueue.length > 0 && !suppressDialog && (
                    <UIDialog
                        hidden={!shouldShowDialogMessage}
                        dialogContentProps={{
                            title: t('TOOL_DISCLAIMER_TITLE'),
                            subText: dialogQueue[0]?.message
                        }}
                        acceptButtonText={t('OK')}
                        onAccept={closeAdpWarningDialog}
                    />
                )}

                {scenario === 'FE_FROM_SCRATCH' ? (
                    <UIDialog
                        hidden={!isWarningDialogVisible}
                        closeButtonAriaLabel={t('CLOSE')}
                        dialogContentProps={{
                            title: t('TOOL_DISCLAIMER_TITLE'),
                            subText: t('TOOL_DISCLAIMER_TEXT')
                        }}
                        acceptButtonText={t('OK')}
                        onAccept={closeWarningDialog}>
                        <UILink href="https://ui5.sap.com/#/topic/03265b0408e2432c9571d6b3feb6b1fd">
                            {t('FE_DOCUMENTATION_LINK_TEXT')}
                        </UILink>
                        <UIToggle
                            className="space space-toggle"
                            label={t('DONT_SHOW_WARNING_ON_START')}
                            inlineLabel
                            inlineLabelLeft
                            labelFlexGrow
                            checked={hideWarningDialog}
                            onChange={(_event, checked = false): void => {
                                setHideWarningDialog(checked);
                            }}
                        />
                    </UIDialog>
                ) : (
                    <></>
                )}
            </div>
        </div>
    );
}
