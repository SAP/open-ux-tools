import React from 'react';
import { AddonPanel, Code, SyntaxHighlighter } from '@storybook/components';

export const render = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    const dummyCode = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <Page title="Main">
        <content />
    </Page>
</mvc:View>`;
    return <AddonPanel key="panel" active={active}>
        <SyntaxHighlighter language='html'>{dummyCode}</SyntaxHighlighter>
        <Code>{dummyCode}</Code>
    </AddonPanel>
}
