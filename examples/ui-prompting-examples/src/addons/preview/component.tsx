import { AddonPanel, Form, SyntaxHighlighter } from '@storybook/components';
import React, { useEffect, useState } from 'react';
import { addons } from '@storybook/addons';
import { UPDATE_CODE_SNIPPET, getWebSocket, onMessageAttach } from '../../utils';
import type { Actions } from '../../utils';

getWebSocket(false);

type SupportedLanguages = 'html' | 'json';

export const render = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    const [preview, setPreview] = useState<{
        codeSnippets: { content: string; fileName: string; language: SupportedLanguages }[];
        answers: unknown;
    }>({
        answers: {},
        codeSnippets: []
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
                    codeSnippets: Object.values(responseAction.codeSnippets).map((snippet) => ({
                        content: snippet.content,
                        fileName: snippet.filePathProps?.fileName ?? 'Please select a file',
                        language: snippet.language === 'xml' ? 'html' : (snippet.language as SupportedLanguages)
                    })),
                    answers: answersPreview
                });
            }
        };
        onMessageAttach(UPDATE_CODE_SNIPPET, handleMessage);
        const channel = addons.getChannel();
        channel.on('storyChanged', () => {
            // Reset to default when story is changed
            setPreview({
                answers: {},
                codeSnippets: []
            });
        });
    }, []);

    return (
        <AddonPanel key="panel" active={active}>
            {preview.codeSnippets.map((snippet) => (
                <Form.Field label={snippet.fileName} key={snippet.fileName}>
                    <SyntaxHighlighter language={snippet.language ?? 'html'}>{snippet.content}</SyntaxHighlighter>
                </Form.Field>
            ))}
            <Form.Field label="Answers">
                <SyntaxHighlighter language="json">{preview.answers}</SyntaxHighlighter>
            </Form.Field>
        </AddonPanel>
    );
};
