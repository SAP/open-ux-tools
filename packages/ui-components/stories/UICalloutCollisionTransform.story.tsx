import React, { useState } from 'react';
import type { SetStateAction } from 'react';
import { ContextualMenu, Stack } from '@fluentui/react';
import type { IComboBox, IComboBoxOption, IDropdownOption } from '@fluentui/react';

import {
    UIComboBox,
    UISelectableOptionMenuItemType,
    UIDefaultButton,
    UIDialog,
    UIIcon,
    UIDropdown
} from '../src/components';
import { UICheckbox } from '../src/components/UICheckbox';
import { data, groupsData } from '../test/__mock__/select-data';

import { UiIcons, initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Dialogs/CalloutCollisionTransform' };

enum ControlTypes {
    ComboBox = 'ComboBox',
    Dropdown = 'Dropdown'
}

const controlTypesOptions = Object.values(ControlTypes).map((value) => ({ key: value, text: value }));

const getContent = (controlType: ControlTypes, enabled: boolean) => {
    const content: React.ReactElement[] = [];
    for (let i = 0; i < 6; i++) {
        const Control = controlType === ControlTypes.ComboBox ? UIComboBox : UIDropdown;
        content.push(
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
