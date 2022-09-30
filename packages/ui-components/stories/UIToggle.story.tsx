import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';

import { UIToggle, UIToggleSize } from '../src/components/UIToggle';

export default { title: 'Basic Inputs/Toggle/Buttons' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: 300
            }}>
            <Text variant="large" className="textColor">
                UIToggle
            </Text>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    default
                </Text>
                <UIToggle />
            </Stack>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    set to checked
                </Text>
                <UIToggle defaultChecked />
            </Stack>
        </Stack>
    );
};

export const asDisabled = (): JSX.Element => {
    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: 300
            }}>
            <Text variant="large" className="textColor">
                UIToggle disabled
            </Text>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    default
                </Text>
                <UIToggle disabled />
            </Stack>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    disabled as checked
                </Text>
                <UIToggle disabled defaultChecked />
            </Stack>
        </Stack>
    );
};

export const withLabel = (): JSX.Element => {
    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: 300
            }}>
            <Text variant="large" className="textColor">
                UIToggle with label
            </Text>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    with inline label
                </Text>
                <UIToggle defaultChecked inlineLabel label="Wizard mode" />
            </Stack>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    with inline label on the left
                </Text>
                <UIToggle defaultChecked inlineLabel label="Wizard mode" inlineLabelLeft />
            </Stack>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    with Grow label width
                </Text>
                <UIToggle defaultChecked inlineLabel label="Wizard mode" inlineLabelLeft labelFlexGrow />
            </Stack>
        </Stack>
    );
};

export const smallSize = (): JSX.Element => {
    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: 300
            }}>
            <Text variant="large" className="textColor">
                UIToggle with label
            </Text>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium">small size</Text>
                <UIToggle label="Small toggle" inlineLabel inlineLabelLeft size={UIToggleSize.Small} />
            </Stack>
        </Stack>
    );
};

export const withMessages = () => {
    const message = 'Dummy message';
    return (
        <>
            <div style={{ width: '300px' }}>
                <UIToggle label="Error" errorMessage={message} />
                <UIToggle label="Warning" warningMessage={message} />
                <UIToggle label="Info" infoMessage={message} />
            </div>
            <div style={{ marginTop: '30px', width: '300px' }}>
                <UIToggle label="Error" inlineLabel={true} errorMessage={message} />
                <UIToggle label="Warning" inlineLabel={true} warningMessage={message} labelFlexGrow />
                <UIToggle label="Info" inlineLabel={true} infoMessage={message} />
            </div>
            <div style={{ marginTop: '30px', width: '300px' }}>
                <UIToggle label="Error" inlineLabel={true} inlineLabelLeft={true} errorMessage={message} />
                <UIToggle label="Warning" inlineLabel={true} inlineLabelLeft={true} warningMessage={message} />
                <UIToggle label="Info" inlineLabel={true} inlineLabelLeft={true} labelFlexGrow infoMessage={message} />
            </div>
        </>
    );
};
