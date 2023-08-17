import type { ReactElement } from 'react';
import React, { useState } from 'react';

import { TextField, Label, Stack } from '@fluentui/react';
import { UIIconButton, UiIcons, UITooltip, UITooltipUtils, UIDirectionalHint } from '@sap-ux/ui-components';

import './Properties.scss';
import { defaultFontSize, sectionHeaderFontSize } from './constants';
import { PropertyDocumentation } from './PropertyDocumentation';
import type { PropertiesInfo } from '../../../adaptation/ui5/utils';
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
 * @param headerFieldProps
 * @returns {ReactElement}
 */
export function HeaderField(headerFieldProps: HeaderFieldProps): ReactElement {
    const { label, value, documentation, hidden = true } = headerFieldProps;
    const [isCopyMessageBoxVisible, setMessageBoxVisibility] = useState(false);
    const documentationContent = documentation && (
        <PropertyDocumentation
            defaultValue={documentation.defaultValue}
            description={documentation.description}
            propertyName={documentation.propertyName}
            propertyType={documentation.propertyType}
        />
    );

    return (
        <>
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
                    value={value}
                    readOnly={true}
                    borderless
                    styles={{
                        field: {
                            color: 'var(--vscode-input-foreground)',
                            fontSize: defaultFontSize,
                            backgroundColor: 'var(--vscode-sideBar-background)'
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
                    onRenderSuffix={(): JSX.Element => {
                        return (
                            <UIIconButton
                                id={`${label.replace(/\s/g, '')}--copy`}
                                iconProps={{ iconName: UiIcons.Copy }}
                                onClick={(): void => {
                                    copyToClipboard(value);
                                    setMessageBoxVisibility(!isCopyMessageBoxVisible);
                                    setTimeout(() => setMessageBoxVisibility(false), 3000);
                                }}
                            />
                        );
                    }}
                />
                {isCopyMessageBoxVisible && <Clipboard label={label} />}
            </Stack>
        </>
    );
}

/**
 * Copy given string to clipboard, show toast success message.
 *
 * @param text {string to copy to clipboard}
 */
function copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).catch((reason) => console.error(reason));
}
