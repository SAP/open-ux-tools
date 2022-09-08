import React, { useState } from 'react';
import { UIIconButton } from '../src/components/UIButton';
import { UICallout, UICalloutContentPadding } from '../src/components/UICallout';
import { initIcons, UiIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Dropdowns/Callout' };

export const Callout = (): JSX.Element => {
    const id = 'callout-test-id';
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
