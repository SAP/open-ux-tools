import type { FormEvent } from 'react';
import React, { useState } from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack, ContextualMenu } from '@fluentui/react';

import { UIDialog } from '../src/components/UIDialog';
import { UIDefaultButton } from '../src/components/UIButton';
import { UITextInput } from '../src/components/UIInput';
import { UIDropdown } from '../src/components/UIDropdown';
import { UIComboBox } from '../src/components/UIComboBox';
import { UICheckbox } from '../src/components/UICheckbox';

export default { title: 'Dialogs/Dialogs' };

const stackTokens: IStackTokens = { childrenGap: 40 };

const TEXTFIELD_MARGIN = {
    main: {
        ['.ms-TextField-wrapper > .ms-Label']: {
            margin: 0
        }
    }
};

interface TestDialogProps {
    openAnimation: boolean;
}

class Test extends React.Component<
    TestDialogProps & {
        draggable: boolean;
    }
> {
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
        const additionalProps = this.props.draggable
            ? {
                  modalProps: {
                      dragOptions: {
                          moveMenuItemText: 'Move',
                          closeMenuItemText: 'Close',
                          menu: ContextualMenu,
                          keepInBounds: true
                      }
                  }
              }
            : undefined;
        return (
            <>
                <UIDefaultButton onClick={this.onToggle} primary>
                    {draggable ? 'Open Draggable Dialog' : 'Open Dialog'}
                </UIDefaultButton>
                <UIDialog
                    isOpen={this.state.isOpen}
                    isOpenAnimated={this.props.openAnimation}
                    isBlocking={true}
                    title={'Header Title'}
                    acceptButtonText={'Accept'}
                    cancelButtonText={'Cancel'}
                    {...additionalProps}
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

const LargeDialog = (props: TestDialogProps & { size?: number }): JSX.Element => {
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
                isOpenAnimated={props.openAnimation}
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

const ConfirmDialog = (props: TestDialogProps): JSX.Element => {
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
                isOpenAnimated={props.openAnimation}
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

const MultipleButtons = (props: TestDialogProps): JSX.Element => {
    const [isVisible, setVisible] = useState(false);
    const toggle = (): void => {
        setVisible(!isVisible);
    };
    return (
        <>
            <UIDefaultButton onClick={toggle} primary>
                Open Dialog with multiple buttons
            </UIDefaultButton>
            <UIDialog
                isOpen={isVisible}
                isOpenAnimated={props.openAnimation}
                isBlocking={true}
                onDismiss={toggle}
                title="Delete Confirmation"
                dialogContentProps={{
                    subText: 'This entry includes subelements. Are you sure you want to delete the entry or only its subelements? This action cannot be undone.'
                }}
                footer={[
                    <UIDefaultButton key="1" onClick={toggle} primary text="Delete entry and subelements" />,
                    <UIDefaultButton key="2" onClick={toggle} text="Delete entry only" />,
                    <UIDefaultButton key="3" onClick={toggle} text="Cancel" />
                ]}></UIDialog>
        </>
    );
};

export const Dialog = () => {
    const [openAnimation, setOpenAnimation] = useState(true);

    return (
        <Stack tokens={stackTokens}>
            <Stack tokens={stackTokens}>
                <Text variant={'large'} block>
                    Dialogs
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UICheckbox
                        label="Open animation enabled"
                        checked={openAnimation}
                        onChange={(event: any, value: any) => {
                            setOpenAnimation(value);
                        }}
                    />
                </Stack>
                <Stack horizontal tokens={stackTokens}>
                    <Test draggable={false} openAnimation={openAnimation} />
                </Stack>
                <Stack horizontal tokens={stackTokens}>
                    <Test draggable={false} openAnimation={openAnimation} />
                </Stack>
                <Stack horizontal tokens={stackTokens}>
                    <Test draggable={true} openAnimation={openAnimation} />
                </Stack>
                <Stack horizontal tokens={stackTokens}>
                    <LargeDialog openAnimation={openAnimation} />
                </Stack>
                <Stack horizontal tokens={stackTokens}>
                    <LargeDialog size={400} openAnimation={openAnimation} />
                </Stack>
                <Stack horizontal tokens={stackTokens}>
                    <LargeDialog openAnimation={openAnimation} />
                </Stack>
                <Stack horizontal tokens={stackTokens}>
                    <ConfirmDialog openAnimation={openAnimation} />
                </Stack>
                <Stack horizontal tokens={stackTokens}>
                    <MultipleButtons openAnimation={openAnimation} />
                </Stack>
            </Stack>
        </Stack>
    );
};
