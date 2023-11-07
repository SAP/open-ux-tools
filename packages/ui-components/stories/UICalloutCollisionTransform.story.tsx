import React, { useState } from 'react';
import type { SetStateAction } from 'react';
import { ContextualMenu, Stack } from '@fluentui/react';
import type { ICalloutProps, IComboBox, IComboBoxOption, IDropdownOption } from '@fluentui/react';

import {
    UIComboBox,
    UISelectableOptionMenuItemType,
    UIDefaultButton,
    UIDialog,
    UIIcon,
    UIDropdown,
    UITextInput,
    UICallout,
    UICalloutProps
} from '../src/components';
import { UICheckbox } from '../src/components/UICheckbox';
import { data, groupsData } from '../test/__mock__/select-data';

import { UiIcons, initIcons } from '../src/components/Icons';
import { CalloutCollisionTransform } from '../src/components/UIComboBox/CalloutCollisionTransform';

initIcons();

export default { title: 'Dialogs/CalloutCollisionTransform' };

enum ControlTypes {
    ComboBox = 'ComboBox',
    Dropdown = 'Dropdown',
    Callout = 'Callout'
}

const controlTypesOptions = Object.values(ControlTypes).map((value) => ({ key: value, text: value }));

const getCalloutCollisionTransformationProps = (
    calloutCollisionTransform: CalloutCollisionTransform
): Pick<ICalloutProps, 'preventDismissOnEvent' | 'layerProps'> => {
    return {
        preventDismissOnEvent: calloutCollisionTransform.preventDismissOnEvent,
        layerProps: {
            onLayerDidMount: calloutCollisionTransform.applyTransformation,
            onLayerWillUnmount: calloutCollisionTransform.resetTransformation
        }
    };
};

const CustomCallout = (props: { id: string }) => {
    const domRef = React.useRef<HTMLDivElement>(null);
    const menuDomRef = React.useRef<HTMLDivElement>(null);
    const calloutCollisionTransform = React.useRef<CalloutCollisionTransform>(
        new CalloutCollisionTransform(domRef, menuDomRef)
    );
    const { id } = props;
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <div ref={domRef}>
                <UITextInput
                    id={id}
                    onClick={() => {
                        setIsOpen(!isOpen);
                    }}
                />
            </div>
            {isOpen && (
                <UICallout
                    target={`#${id}`}
                    hidden={!isOpen}
                    isBeakVisible={true}
                    beakWidth={5}
                    directionalHint={4}
                    onDismiss={() => setIsOpen(!isOpen)}
                    calloutWidth={300}
                    calloutMinWidth={300}
                    {...getCalloutCollisionTransformationProps(calloutCollisionTransform.current)}
                    popupProps={{
                        ref: menuDomRef
                    }}>
                    <div>
                        lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut
                        labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris
                        nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate
                        velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident
                        sunt in culpa qui officia deserunt
                    </div>
                </UICallout>
            )}
        </>
    );
};

const getContent = (controlType: ControlTypes, enabled: boolean) => {
    const content: React.ReactElement[] = [];

    for (let i = 0; i < 6; i++) {
        let element: React.ReactElement;
        if (controlType === ControlTypes.Callout) {
            element = <CustomCallout key={i} id={`Dummy-${i}`} />;
        } else {
            const Control = controlType === ControlTypes.ComboBox ? UIComboBox : UIDropdown;
            element = (
                <Control
                    key={i}
                    label="Dummy"
                    highlight={true}
                    options={data}
                    multiSelect={true}
                    calloutCollisionTransformation={enabled}
                />
            );
        }
        content.push(element);
    }

    return content;
};

export const multiSelectInDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const [selectedType, setSelectedType] = useState<string>(ControlTypes.ComboBox);
    const onToggle = () => {
        setIsOpen(!isOpen);
    };
    return (
        <>
            <h3>Settings</h3>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: '20px',
                    maxWidth: '1200px',
                    marginBottom: '20px'
                }}>
                <UICheckbox
                    label={'Transformation is enabled'}
                    checked={enabled}
                    onChange={() => {
                        setEnabled(!enabled);
                    }}
                    styles={{
                        label: {
                            alignItems: 'center'
                        }
                    }}
                />
                <UIDropdown
                    label="Inner components"
                    options={controlTypesOptions}
                    selectedKey={selectedType}
                    onChange={(event, option?: IDropdownOption<any> | undefined) => {
                        const key = option?.key;
                        if (typeof key === 'string') {
                            setSelectedType(key || ControlTypes.ComboBox);
                        }
                    }}
                />
            </div>
            <UIDefaultButton onClick={onToggle} primary>
                Open Dialog
            </UIDefaultButton>
            <UIDialog
                isOpen={isOpen}
                isOpenAnimated={true}
                isBlocking={true}
                title={'Header Title'}
                acceptButtonText={'Accept'}
                cancelButtonText={'Cancel'}
                modalProps={{
                    dragOptions: {
                        moveMenuItemText: 'Move',
                        closeMenuItemText: 'Close',
                        menu: ContextualMenu,
                        keepInBounds: true
                    }
                }}
                onCancel={onToggle}
                onDismiss={onToggle}>
                {getContent(ControlTypes[selectedType], enabled)}
            </UIDialog>
        </>
    );
};
