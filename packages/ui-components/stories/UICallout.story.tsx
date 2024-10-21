import React, { useState } from 'react';
import { UIDefaultButton, UIIconButton } from '../src/components/UIButton';
import { UICallout, UICalloutContentPadding } from '../src/components/UICallout';
import { UIFocusZone } from '../src/components/UIFocusZone';
import { UiIcons } from '../src/components/Icons';

export default { title: 'Dropdowns/Callout' };

const CalloutWithText = (props: { id: string }): JSX.Element => {
    const { id } = props;
    const [isCalloutVisible, setCalloutVisible] = useState(false);
    const toggleCallout = (): void => {
        setCalloutVisible(!isCalloutVisible);
    };
    return (
        <div>
            <UIIconButton
                id={id}
                iconProps={{ iconName: UiIcons.Bulb }}
                checked={isCalloutVisible}
                onClick={toggleCallout}></UIIconButton>
            {isCalloutVisible && (
                <UICallout
                    target={`#${id}`}
                    isBeakVisible={true}
                    beakWidth={5}
                    directionalHint={4}
                    onDismiss={() => toggleCallout()}
                    calloutWidth={300}
                    calloutMinWidth={300}
                    contentPadding={UICalloutContentPadding.Standard}>
                    <div>
                        lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut
                        labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris
                        nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate
                        velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident
                        sunt in culpa qui officia deserunt
                    </div>
                </UICallout>
            )}
        </div>
    );
};

const CalloutWithItems = (props: { id: string }): JSX.Element => {
    const { id } = props;
    const [isCalloutVisible, setCalloutVisible] = useState(false);
    const toggleCallout = (): void => {
        setCalloutVisible(!isCalloutVisible);
    };
    return (
        <div>
            <UIDefaultButton
                id={id}
                iconProps={{ iconName: UiIcons.Bulb }}
                checked={isCalloutVisible}
                onClick={toggleCallout}>
                Open
            </UIDefaultButton>
            {isCalloutVisible && (
                <UICallout
                    target={`#${id}`}
                    isBeakVisible={true}
                    setInitialFocus={true}
                    beakWidth={5}
                    directionalHint={4}
                    onDismiss={() => toggleCallout()}
                    calloutWidth={300}
                    calloutMinWidth={300}
                    contentPadding={UICalloutContentPadding.Standard}
                    focusTargetSiblingOnTabPress={true}>
                    <div>
                        <UIFocusZone>
                            <UIDefaultButton onClick={toggleCallout}>Option 1</UIDefaultButton>
                            <UIDefaultButton onClick={toggleCallout}>Option 2</UIDefaultButton>
                            <UIDefaultButton onClick={toggleCallout}>Option 3</UIDefaultButton>
                        </UIFocusZone>
                    </div>
                </UICallout>
            )}
        </div>
    );
};

export const Callout = (): JSX.Element => {
    return (
        <div>
            <CalloutWithText id="callout-with-text-id" />
            <CalloutWithItems id="callout-with-items-1-id" />
            <CalloutWithItems id="callout-with-items-2-id" />
        </div>
    );
};
