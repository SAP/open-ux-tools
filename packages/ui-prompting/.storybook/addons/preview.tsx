import { AddonPanel, Form, SyntaxHighlighter } from '@storybook/components';
import React, { useEffect, useState } from 'react';
import { addons } from '@storybook/addons';

const storageKey = 'storybook-answers';
function getCurrentAnswers(): string {
    return window.localStorage.getItem(storageKey) ?? '{}';
}

export const render = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    const [answers, setAnswers] = useState(getCurrentAnswers());
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
            <Form.Field label="Answers">
                <SyntaxHighlighter language="json">{answers}</SyntaxHighlighter>
            </Form.Field>
        </AddonPanel>
    );
};
