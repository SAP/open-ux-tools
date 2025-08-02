import React from 'react';
import { Stack } from '@fluentui/react';
import type { IStackTokens } from '@fluentui/react';
import {
    initIcons,
    UICheckbox,
    UIComboBox,
    UIDatePicker,
    UIDropdown,
    UITextInput,
    UITreeDropdown
} from '../src/components';
import { ErrorMessageType } from '../src/helper/ValidationMessage';
import { data } from '../test/__mock__/select-data';

initIcons();

export default { title: 'Utilities/Misc' };

const enum ComponentsWithMessages {
    UIComboBox = 'UIComboBox',
    UIDropdown = 'UIDropdown',
    UITextInput = 'UITextInput',
    UITreeDropdown = 'UITreeDropdown',
    UIDatePicker = 'UIDatePicker'
}

const stackTokens: IStackTokens = { childrenGap: 20 };

const messageTypeToPropertyMap = new Map([
    [ErrorMessageType.Error, 'errorMessage'],
    [ErrorMessageType.Warning, 'warningMessage'],
    [ErrorMessageType.Info, 'infoMessage']
]);

const renderControl = (
    componentType: ComponentsWithMessages,
    messageType: ErrorMessageType,
    isAbsolute?: boolean
): React.ReactElement => {
    let component: React.ReactElement = <div>Unsupported</div>;
    const messageProperty: string = messageTypeToPropertyMap.get(messageType) ?? 'errorMessage';
    const commonProps = {
        label: `${componentType} ${messageType}`,
        isAbsolute,
        [messageProperty]:
            'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'
    };
    switch (componentType) {
        case ComponentsWithMessages.UIComboBox: {
            component = <UIComboBox {...commonProps} options={data} useComboBoxAsMenuMinWidth />;
            break;
        }
        case ComponentsWithMessages.UIDropdown: {
            component = <UIDropdown {...commonProps} options={data} useDropdownAsMenuMinWidth />;
            break;
        }
        case ComponentsWithMessages.UIDatePicker: {
            component = <UIDatePicker {...commonProps} />;
            break;
        }
        case ComponentsWithMessages.UITextInput: {
            component = <UITextInput {...commonProps} />;
            break;
        }
        case ComponentsWithMessages.UITreeDropdown: {
            component = (
                <UITreeDropdown
                    {...commonProps}
                    items={data.map((option) => ({
                        label: option.text,
                        value: option.key
                    }))}
                    onParameterValueChange={() => {}}
                    placeholderText=""
                />
            );
            break;
        }
    }
    return <div style={{ width: '300px' }}>{component}</div>;
};

const renderControls = (componentType: ComponentsWithMessages, isAbsolute?: boolean): React.ReactElement => {
    const types = [ErrorMessageType.Error, ErrorMessageType.Warning, ErrorMessageType.Info];
    return (
        <Stack horizontal tokens={stackTokens}>
            {types.map((type) => renderControl(componentType, type, isAbsolute))}
        </Stack>
    );
};

const css1 = `
.ui-DatePicker {
    height: auto;
    max-height: none;
}
.ms-TextField .ms-Label,
.ui-treeDropdown-with-label {
    margin-top: 0;
}
.ui-treeDropdown label {
    position: static;
}
`;

export const messages = () => {
    const [isAbsolute, setIsAbsolute] = React.useState(true);
    const components = [
        ComponentsWithMessages.UIComboBox,
        ComponentsWithMessages.UIDropdown,
        ComponentsWithMessages.UITextInput,
        ComponentsWithMessages.UITreeDropdown,
        ComponentsWithMessages.UIDatePicker
    ];
    const content = components.map((component) => renderControls(component, isAbsolute));
    return (
        <div>
            <Stack horizontal tokens={stackTokens}>
                <UICheckbox
                    label="Absolute/floating"
                    checked={isAbsolute}
                    onChange={(event, value?: boolean) => {
                        setIsAbsolute(!!value);
                    }}
                />
            </Stack>
            <Stack horizontal={false} tokens={stackTokens}>
                {content}
            </Stack>
            <style>{css1}</style>
        </div>
    );
};
