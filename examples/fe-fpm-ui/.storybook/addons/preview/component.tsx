import { AddonPanel, Button, Code } from '@storybook/components';
import React, { useState } from 'react';
import { SupportedBuildingBlocks, getCodeSnippet, getWebSocket } from '../../../stories/utils';

getWebSocket();

export const render = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    const dummyCode = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <Page title="Main">
        <content />
    </Page>
</mvc:View>`;
    const [code, setCode] = useState(dummyCode);

    function handleRefresh() {
        // TODO - communicate with the main panel to get the answers
        getCodeSnippet(SupportedBuildingBlocks.Table, {}).then(({ codeSnippet }) => {
            setCode(codeSnippet ?? dummyCode);
        });
    }
    return (
        <AddonPanel key="panel" active={active}>
            <Button secondary type="submit" onClick={handleRefresh}>
                Refresh
            </Button>
            <Code>{code}</Code>
        </AddonPanel>
    );
};
