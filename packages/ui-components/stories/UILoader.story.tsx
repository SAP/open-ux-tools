import React, { useState } from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack, SpinnerSize } from '@fluentui/react';

import { UILoader } from '../src/components/UILoader';
import { initIcons } from '../src/components/Icons';
import { UIDefaultButton } from '../src/components/UIButton';
import { UIDialog } from '../src/components/UIDialog';

export default { title: 'Progress/Loader' };

initIcons();
const stackTokens: IStackTokens = { childrenGap: 40 };

export const Loaders = () => (
    <Stack tokens={stackTokens}>
        <Stack tokens={stackTokens}>
            <Text>Default Loader</Text>
            <Stack horizontal>
                <UILoader />
            </Stack>
        </Stack>
        <Stack tokens={stackTokens}>
            <Text>Large loader</Text>
            <Stack horizontal>
                <UILoader size={SpinnerSize.large} />
            </Stack>
        </Stack>
        <Stack tokens={stackTokens}>
            <Text>Medium loader</Text>
            <Stack horizontal>
                <UILoader size={SpinnerSize.medium} />
            </Stack>
        </Stack>
        <Stack tokens={stackTokens}>
            <Text>Small loader</Text>
            <Stack horizontal>
                <UILoader size={SpinnerSize.small} />
            </Stack>
        </Stack>
        <Stack tokens={stackTokens}>
            <Text>xSmall loader</Text>
            <Stack horizontal>
                <UILoader size={SpinnerSize.xSmall} />
            </Stack>
        </Stack>
        <Stack
            tokens={stackTokens}
            style={{
                position: 'relative'
            }}>
            <Text>Loader - block DOM</Text>
            <Stack horizontal>
                <UILoader blockDOM={true} />
            </Stack>
        </Stack>
        <Stack
            tokens={stackTokens}
            style={{
                position: 'relative',
                height: '75px'
            }}>
            <Text>Loader - block DOM with text...</Text>
            <Stack horizontal>
                <UILoader blockDOM={true} label={'Loader label...'} />
            </Stack>
        </Stack>
        <Stack tokens={stackTokens}>
            <Text>Small loader - css class</Text>
            <Stack horizontal>
                <UILoader className="uiLoaderXSmall" />
            </Stack>
        </Stack>
        <Stack tokens={stackTokens}>
            <Text>Large loader - css class</Text>
            <Stack horizontal>
                <UILoader className="uiLoaderXLarge" />
            </Stack>
        </Stack>
    </Stack>
);

export const Delayed = () => {
    const [isVisible, setVisible] = useState(false);

    return (
        <>
            <div>
                <div
                    style={{
                        position: 'relative',
                        height: '100px',
                        width: '300px',
                        textAlign: 'center'
                    }}>
                    <Text>Loader - delayed</Text>
                    {isVisible && <UILoader delayed={true} blockDOM={true} label={'Delayed loader'} />}
                </div>
                <div>
                    <UIDefaultButton
                        text="Toggle Loader"
                        onClick={() => {
                            setVisible(!isVisible);
                        }}
                    />
                </div>
            </div>
        </>
    );
};

const loaderDialogCss = `
    .popup--busy .ms-Dialog-content {
        position: static;
    }
`;
const DialogWithLoader = (props: { delayed: boolean; text: string }) => {
    const { delayed, text } = props;
    const [isOpen, setOpen] = useState(false);
    const [isBusy, setBusy] = useState(false);
    const onToggle = () => {
        setOpen(!isOpen);
    };
    const showLoader = () => {
        setBusy(true);
        setTimeout(() => {
            setBusy(false);
            onToggle();
        }, 500);
    };

    return (
        <>
            <UIDefaultButton onClick={onToggle} primary>
                {text}
            </UIDefaultButton>
            <UIDialog
                isOpen={isOpen}
                isBlocking={true}
                title={'Header Title'}
                acceptButtonText={'Accept'}
                cancelButtonText={'Cancel'}
                onAccept={onToggle}
                onCancel={onToggle}
                onDismiss={onToggle}
                modalProps={{
                    className: 'popup--busy'
                }}
                footer={
                    <div>
                        <UIDefaultButton onClick={showLoader}>Accept</UIDefaultButton>
                    </div>
                }>
                <div>Dummy</div>
                {isBusy && <UILoader className={'uiLoaderXLarge'} blockDOM={true} delayed={delayed} />}
            </UIDialog>
        </>
    );
};
export const Dialogs = () => {
    return (
        <>
            <style>{loaderDialogCss}</style>
            <div>
                <DialogWithLoader delayed={false} text="Open Dialog with loader" />
            </div>
            <div>
                <DialogWithLoader delayed={true} text="Open Dialog with delayed loader" />
            </div>
        </>
    );
};
