import type { FormEvent } from 'react';
import React, { useState } from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack, ContextualMenu } from '@fluentui/react';

import { UIDialog } from '../src/components/UIDialog';
import { UIDefaultButton } from '../src/components/UIButton';
import { UITextInput } from '../src/components/UIInput';
import { UIDropdown } from '../src/components/UIDropdown';
import { UIComboBox } from '../src/components/UIComboBox';

import { initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Dialogs/Dialogs' };

const stackTokens: IStackTokens = { childrenGap: 40 };

const TEXTFIELD_MARGIN = {
    main: {
        ['.ms-TextField-wrapper > .ms-Label']: {
            margin: 0
        }
    }
};

class Test extends React.Component<{
    draggable: boolean;
}> {
    state = {
        isOpen: false,
        text: 'Some Text'
    };

    onChange = (e: FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        this.setState({ text: (e.target as HTMLInputElement).value });
    };
    onToggle = () => {
        this.setState({ isOpen: !this.state.isOpen });
    };
    onAccept = () => {
        alert(`You wrote: ${this.state.text}`);
        this.setState({ isOpen: false });
    };

    render(): JSX.Element {
        const { draggable } = this.props;
        const testOptions = [
            {
                key: '111',
                text: 'Dummy option 111'
            },
            {
                key: '222',
                text: 'Dummy option 222'
            }
        ];
        return (
            <>
                <UIDefaultButton onClick={this.onToggle} primary>
                    {draggable ? 'Open Draggable Dialog' : 'Open Dialog'}
                </UIDefaultButton>
                <UIDialog
                    isOpen={this.state.isOpen}
                    isBlocking={true}
                    title={'Header Title'}
                    acceptButtonText={'Accept'}
                    cancelButtonText={'Cancel'}
                    modalProps={
                        this.props.draggable
                            ? {
                                  dragOptions: {
                                      moveMenuItemText: 'Move',
                                      closeMenuItemText: 'Close',
                                      menu: ContextualMenu,
                                      keepInBounds: true
                                  }
                              }
                            : undefined
                    }
                    onAccept={this.onAccept}
                    styles={TEXTFIELD_MARGIN}
                    onCancel={this.onToggle}
                    onDismiss={this.onToggle}>
                    <UITextInput label="Dialog Content" value={this.state.text} onChange={this.onChange} />
                    <UIDropdown label="Dummy" options={testOptions} />
                    <UIComboBox label="Dummy" highlight={true} options={testOptions} />
                </UIDialog>
            </>
        );
    }
}

const LargeDialog = (props: { size?: number }): JSX.Element => {
    const [isVisible, setVisible] = useState(false);
    const toggle = (): void => {
        setVisible(!isVisible);
    };
    const main: any = {
        ...TEXTFIELD_MARGIN.main
    };
    const { size } = props;
    if (size) {
        main.height = size;
    }
    let text = 'Open Large Dialog';
    if (size) {
        text += ` height=${size}`;
    }
    return (
        <>
            <UIDefaultButton onClick={toggle} primary>
                {text}
            </UIDefaultButton>
            <UIDialog
                isOpen={isVisible}
                isBlocking={true}
                title={'Header Title'}
                acceptButtonText={'Accept'}
                cancelButtonText={'Cancel'}
                styles={{
                    main
                }}
                onAccept={toggle}
                onCancel={toggle}
                onDismiss={toggle}>
                <UIDropdown label="Dummy" options={[]} />
                <UITextInput label="Username" />
                <UITextInput label="Email" />
                <UITextInput label="Password" type="password" />
                <UITextInput label="Email" />
                <UITextInput label="First name" />
                <UITextInput label="Last name" />
                <UITextInput label="Address" />
                <UITextInput label="State" />
                <UITextInput label="Country" />
                <UITextInput label="Phone" />
                <UITextInput label="Dummy 1" />
                <UITextInput label="Dummy 2" />
                <UITextInput label="Dummy 3" />
                <UITextInput label="Dummy 4" />
                <UITextInput label="Dummy 5" />
            </UIDialog>
        </>
    );
};

const ConfirmDialog = (): JSX.Element => {
    const [isVisible, setVisible] = useState(false);
    const toggle = (): void => {
        setVisible(!isVisible);
    };
    return (
        <>
            <UIDefaultButton onClick={toggle} primary>
                Open Confirm Dialog
            </UIDefaultButton>
            <UIDialog
                isOpen={isVisible}
                isBlocking={true}
                onAccept={toggle}
                onCancel={toggle}
                onDismiss={toggle}
                acceptButtonText="Yes"
                cancelButtonText="No"
                title="Delete Confirmation"
                dialogContentProps={{
                    subText: 'Are you sure you want to delete entry? This action cannot be undone.'
                }}></UIDialog>
        </>
    );
};

export const Dialog = () => (
    <Stack tokens={stackTokens}>
        <Stack tokens={stackTokens}>
            <Text variant={'large'} block>
                Dialogs
            </Text>
            <Stack horizontal tokens={stackTokens}>
                <Test draggable={false} />
            </Stack>
            <Stack horizontal tokens={stackTokens}>
                <Test draggable={true} />
            </Stack>
            <Stack horizontal tokens={stackTokens}>
                <LargeDialog />
            </Stack>
            <Stack horizontal tokens={stackTokens}>
                <LargeDialog size={400} />
            </Stack>
            <Stack horizontal tokens={stackTokens}>
                <LargeDialog />
            </Stack>
            <Stack horizontal tokens={stackTokens}>
                <ConfirmDialog />
            </Stack>
        </Stack>
    </Stack>
);
