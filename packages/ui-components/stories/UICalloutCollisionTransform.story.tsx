import React, { useState } from 'react';
import { ContextualMenu } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';

import {
    UIComboBox,
    UIDefaultButton,
    UIDialog,
    UIDropdown,
    UITextInput,
    UICallout,
    UICheckbox,
    CalloutCollisionTransform
} from '../src/components';
import { data } from '../test/__mock__/select-data';

export default { title: 'Dialogs/Dialogs' };

enum ControlTypes {
    ComboBox = 'ComboBox',
    Dropdown = 'Dropdown',
    Callout = 'Callout'
}

const controlTypesOptions = Object.values(ControlTypes).map((value) => ({ key: value, text: value }));

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
            <UICallout
                target={`#${id}`}
                hidden={!isOpen}
                isBeakVisible={false}
                onDismiss={() => {
                    setIsOpen(!isOpen);
                    calloutCollisionTransform.current.resetTransformation();
                }}
                preventDismissOnEvent={calloutCollisionTransform.current.preventDismissOnEvent}
                onPositioned={calloutCollisionTransform.current.applyTransformation}
                popupProps={{
                    ref: menuDomRef
                }}>
                <div style={{ height: 150, width: 300, backgroundColor: 'green' }} />
            </UICallout>
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

export const collisionTransformInDialog = () => {
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
