import type { ReactElement } from 'react';
import React, { useCallback, useState } from 'react';

import { TextField, Label, Stack } from '@fluentui/react';
import { UIIconButton, UiIcons, UITooltip, UITooltipUtils, UIDirectionalHint } from '@sap-ux/ui-components';

import './Properties.scss';
import { defaultFontSize, sectionHeaderFontSize } from './constants';
import { PropertyDocumentation } from './PropertyDocumentation';
import type { PropertiesInfo } from '@sap-ux-private/control-property-editor-common';
import { Clipboard } from './Clipboard';

export interface HeaderFieldProps {
    label: string;
    /**
     * There will be an icon on the screen that allows to copy this value to clipboard
     */
    value: string;

    documentation?: PropertiesInfo;

    hidden?: boolean;
}

/**
 * React element for HeaderField.
 *
 * @param headerFieldProps HeaderFieldProps
 * @returns ReactElement
 */
export function HeaderField(headerFieldProps: Readonly<HeaderFieldProps>): ReactElement {
    const { label, value, documentation, hidden = true } = headerFieldProps;
    const [isCopyMessageBoxVisible, setIsCopyMessageBoxVisible] = useState(false);
    const documentationContent = documentation && (
        <PropertyDocumentation
            defaultValue={documentation.defaultValue}
            description={documentation.description}
            propertyName={documentation.propertyName}
            propertyType={documentation.propertyType}
        />
    );
    const onCopy = useCallback(
        () => (
            <CopyButton
                label={label}
                onClick={(): void => {
                    copyToClipboard(value).catch((reason) => console.error(reason));
                    setIsCopyMessageBoxVisible(!isCopyMessageBoxVisible);
                    setTimeout(() => setIsCopyMessageBoxVisible(false), 3000);
                }}
            />
        ),
        [value]
    );
    return (
        <Stack horizontal={false} verticalAlign={'space-between'} style={{ marginBottom: 4 }}>
            <UITooltip
                hidden={hidden}
                calloutProps={{ gapSpace: 5 }}
                delay={2}
                directionalHint={UIDirectionalHint.leftCenter}
                tooltipProps={UITooltipUtils.renderContent(documentationContent ?? '')}>
                <Label
                    htmlFor={label}
                    data-aria-label={label}
                    data-testid={`${label}--Label`}
                    style={{
                        color: 'var(--vscode-foreground)',
                        fontSize: sectionHeaderFontSize,
                        fontWeight: 'bold',
                        padding: 0,
                        width: '190px',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflowX: 'hidden',
                        marginTop: 2,
                        marginBottom: 4
                    }}>
                    {label}
                </Label>
            </UITooltip>
            <TextField
                id={label}
                data-testid={label}
                value={value}
                readOnly={true}
                title={value}
                borderless
                styles={{
                    field: {
                        color: 'var(--vscode-input-foreground)',
                        fontSize: defaultFontSize,
                        backgroundColor: 'var(--vscode-sideBar-background)',
                        border: '1px solid var(--vscode-input-border)',
                        selectors: {
                            ':hover': {
                                borderColor: 'var(--vscode-focusBorder)'
                            }
                        },
                        padding: 5
                    },
                    fieldGroup: {
                        color: 'var(--vscode-input-foreground)',
                        backgroundColor: 'var(--vscode-sideBar-background)',
                        alignItems: 'center'
                    },
                    suffix: {
                        color: 'var(--vscode-input-foreground)',
                        backgroundColor: 'var(--vscode-sideBar-background)'
                    },
                    subComponentStyles: {
                        label: {
                            root: {
                                fontSize: sectionHeaderFontSize,
                                fontWeight: 'bold !important',
                                color: 'var(--vscode-foreground)'
                            }
                        }
                    }
                }}
                onRenderSuffix={onCopy}
            />
            {isCopyMessageBoxVisible && <Clipboard label={label} />}
        </Stack>
    );
}

/**
 * Copy given string to clipboard, show toast success message.
 *
 * @param text {string to copy to clipboard}
 */
async function copyToClipboard(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
}
interface CopyButtonProps {
    label: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement | HTMLDivElement | HTMLSpanElement>;
}

/**
 * Copy button component.
 *
 * @param props {CopyButtonProps}
 * @returns ReactElement
 */
function CopyButton(props: Readonly<CopyButtonProps>): ReactElement {
    const { label, onClick } = props;

    return (
        <UIIconButton
            id={`${label.replace(/\s/g, '')}--copy`}
            iconProps={{ iconName: UiIcons.Copy }}
            onClick={onClick}
        />
    );
}
