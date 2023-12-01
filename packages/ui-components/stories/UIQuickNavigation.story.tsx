import React from 'react';

import {
    UIQuickNavigation,
    UIDefaultButton,
    UiIcons,
    initIcons,
    UITextInput,
    setQuickNavigationKey
} from '../src/components';

export default { title: 'Utilities/Quick Navigation' };

initIcons();

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

export const Inline = () => {
    return (
        <div style={{ margin: 10 }}>
            <UIQuickNavigation>
                <div {...setQuickNavigationKey('A')}>
                    <Content title="Group 1" />
                </div>
                <div {...setQuickNavigationKey('B')}>
                    <Content title="Group 2" />
                </div>
                <div {...setQuickNavigationKey('C')}>
                    <Content title="Group 3" />
                </div>
                <div {...setQuickNavigationKey('D')}>
                    <Content title="Group 4" />
                </div>
            </UIQuickNavigation>
        </div>
    );
};

export const External = () => {
    return <div>ToDo</div>;
};
