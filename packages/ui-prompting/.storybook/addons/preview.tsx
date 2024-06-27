import { AddonPanel, Form, SyntaxHighlighter } from '@storybook/components';
import React, { useEffect, useState } from 'react';

export const render = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    const [answers, setAnswers] = useState('');
    useEffect(() => {
        window.addEventListener('storage', (event: StorageEvent) => {
            const key = 'storybook-answers';
            if (event.key !== key) {
                return;
            }
            const newValue = window.localStorage.getItem(key) ?? '{}';
            setAnswers(newValue);
        });
    }, []);

    return (
        <AddonPanel key="panel" active={active}>
            <Form.Field label="Answers">
                <SyntaxHighlighter language="json">{answers}</SyntaxHighlighter>
            </Form.Field>
        </AddonPanel>
    );
};
