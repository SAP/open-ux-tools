import { AddonPanel, Form, SyntaxHighlighter } from 'storybook/internal/components';
import React, { useEffect, useState } from 'react';
import { addons } from 'storybook/manager-api';
import { UPDATE_CODE_SNIPPET, getWebSocket, onMessageAttach } from '../../utils/index.js';
import type { Actions } from '../../utils/index.js';
import { useTheme } from 'storybook/theming';

getWebSocket(false);

type SupportedLanguages = 'html' | 'json';

export const CodePreview = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    const [preview, setPreview] = useState<{
        codeSnippets: { content: string; fileName: string; language: SupportedLanguages }[];
        answers: unknown;
    }>({
        answers: {},
        codeSnippets: []
    });
    const theme = useTheme();

    useEffect(function () {
        const handleMessage = (responseAction: Actions) => {
            if (responseAction.type === UPDATE_CODE_SNIPPET) {
                let answersPreview: string;
                try {
                    answersPreview = JSON.stringify(responseAction.answers, undefined, 4);
                } catch {
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
            <div
                style={{
                    height: '100%',
                    background: 'base' in theme && theme.base === 'dark' ? '#1a1a1a' : '#ffffff'
                }}>
                {preview.codeSnippets.map((snippet) => (
                    <Form.Field label={snippet.fileName} key={snippet.fileName}>
                        <SyntaxHighlighter language={snippet.language ?? 'html'}>{snippet.content}</SyntaxHighlighter>
                    </Form.Field>
                ))}
                <Form.Field label="Answers">
                    <SyntaxHighlighter language="json">{preview.answers}</SyntaxHighlighter>
                </Form.Field>
            </div>
        </AddonPanel>
    );
};
