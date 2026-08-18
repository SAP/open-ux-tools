import { AddonPanel, Form, SyntaxHighlighter } from 'storybook/internal/components';
import React, { useEffect, useState } from 'react';
import { addons } from 'storybook/manager-api';
import { useTheme } from 'storybook/theming';

const storageKey = 'storybook-answers';
function getCurrentAnswers(): string {
    return window.localStorage.getItem(storageKey) ?? '{}';
}

export const CodePreview = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    const [answers, setAnswers] = useState(getCurrentAnswers());
    const theme = useTheme();
    useEffect(() => {
        window.addEventListener('storage', (event: StorageEvent) => {
            if (event.key !== storageKey) {
                return;
            }
            setAnswers(getCurrentAnswers());
        });
        const channel = addons.getChannel();
        channel.on('storyChanged', (storyId) => {
            const resetAnswers = '{}';
            window.localStorage.setItem(storageKey, resetAnswers);
            setAnswers(resetAnswers);
        });
    }, []);

    return (
        <AddonPanel key="panel" active={active}>
            <div
                style={{
                    height: '100%',
                    background: theme.base === 'dark' ? '#1a1a1a' : '#ffffff'
                }}>
                <Form.Field label="Answers">
                    <SyntaxHighlighter language="json">{answers}</SyntaxHighlighter>
                </Form.Field>
            </div>
        </AddonPanel>
    );
};
