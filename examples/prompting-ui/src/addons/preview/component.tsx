import { AddonPanel, Form, SyntaxHighlighter } from '@storybook/components';
import React, { useEffect, useState } from 'react';
import { UPDATE_CODE_SNIPPET, getWebSocket, onMessageAttach } from '../../../src/utils';
import type { Actions } from '../../../src/utils';

getWebSocket(false);

export const render = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    const [preview, setPreview] = useState<{ code: string; answers: unknown }>({
        answers: {},
        code: ''
    });

    useEffect(function () {
        const handleMessage = (responseAction: Actions) => {
            if (responseAction.type === UPDATE_CODE_SNIPPET) {
                let answersPreview: string;
                try {
                    answersPreview = JSON.stringify(responseAction.answers, undefined, 4);
                } catch (e) {
                    answersPreview = '{}';
                }
                setPreview({
                    code: responseAction.codeSnippet,
                    answers: answersPreview
                });
            }
        };
        onMessageAttach(UPDATE_CODE_SNIPPET, handleMessage);
    }, []);

    return (
        <AddonPanel key="panel" active={active}>
            <Form.Field label="XML">
                <SyntaxHighlighter language="html">{preview.code}</SyntaxHighlighter>
            </Form.Field>
            <Form.Field label="Answers">
                <SyntaxHighlighter language="json">{preview.answers}</SyntaxHighlighter>
            </Form.Field>
        </AddonPanel>
    );
};
