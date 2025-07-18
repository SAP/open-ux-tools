import React from 'react';

import {
    UIQuickNavigation,
    UIDefaultButton,
    UITextInput,
    setQuickNavigationKey,
    UIQuickNavigationOffset
} from '../src/components';

export default { title: 'Utilities/Quick Navigation' };

const value = {
    name: 'Hello, world!',
    html: '<span><strong>Tag:</strong> name</span>'
};

const Content = (props: { title: string }) => {
    const { title } = props;
    return (
        <div
            style={{
                border: '1px solid red',
                margin: '20px 0',
                padding: 10
            }}>
            <div>{title}</div>
            <UITextInput label="Dummy 1" />
            <UITextInput label="Dummy 2" />
            <UIDefaultButton>Submit</UIDefaultButton>
        </div>
    );
};

const QuickNavigation = (props: { inline: boolean; offsets?: UIQuickNavigationOffset[] }) => {
    const { inline, offsets } = props;
    return (
        <div style={{ margin: 10 }}>
            <div>{`Inline = ${inline}`}</div>
            <UIQuickNavigation inline={inline}>
                <div {...setQuickNavigationKey('A', offsets?.[0])}>
                    <Content title="Group 1" />
                </div>
                <div {...setQuickNavigationKey('B', offsets?.[1])}>
                    <Content title="Group 2" />
                </div>
                <div {...setQuickNavigationKey('C', offsets?.[2])}>
                    <Content title="Group 3" />
                </div>
                <div {...setQuickNavigationKey('D', offsets?.[3])}>
                    <Content title="Group 4" />
                </div>
            </UIQuickNavigation>
        </div>
    );
};

export const Inline = () => {
    return <QuickNavigation inline={true} />;
};

export const External = () => {
    return <QuickNavigation inline={false} />;
};

export const ExternalWithCustomOffset = () => {
    return (
        <QuickNavigation
            inline={false}
            offsets={[
                { y: 30, x: 0 },
                { y: 0, x: 30 },
                { y: -15, x: -15 }
            ]}
        />
    );
};
