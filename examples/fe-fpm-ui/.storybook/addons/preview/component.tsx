import { AddonPanel, SyntaxHighlighter } from '@storybook/components';
import React, { useEffect, useState } from 'react';
import { Actions, UPDATE_CODE_SNIPPET, getWebSocket, onMessageAttach } from '../../../stories/utils';

getWebSocket(false);

export const render = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    const [code, setCode] = useState('');

    useEffect(function () {
        const handleMessage = (responseAction: Actions) => {
            if (responseAction.type === UPDATE_CODE_SNIPPET) {
                setCode(responseAction.codeSnippet);
            }
        };
        onMessageAttach(UPDATE_CODE_SNIPPET, handleMessage);
    }, []);

    return (
        <AddonPanel key="panel" active={active}>
            <SyntaxHighlighter language="html">{code}</SyntaxHighlighter>
        </AddonPanel>
    );
};
