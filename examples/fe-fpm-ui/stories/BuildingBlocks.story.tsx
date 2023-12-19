import React from 'react';
import { Questions } from '../src/components';
import type { Question } from '../src/components';
import { initIcons } from '@sap-ux/ui-components';

export default { title: 'Building Blocks' };

initIcons();

// Connect to the WebSocket server from the preview
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('WebSocket connected from the preview');

    // Send a message from the preview to main.js
    ws.send('Hello from the preview!');
};

export const defaultUsage = (): JSX.Element => {
    const [questions, setQuestions] = React.useState<Question[]>([]);
    React.useEffect(() => {
        // Handle messages received from main.js
        ws.onmessage = (event) => {
            console.log(`Received message from main.js: ${event.data}`);
            const action = JSON.parse(event.data);
            if (action.type === 'update') {
                setQuestions(action.data);
            }
        };
    }, [])
    return <Questions questions={questions} onChoiceRequest={(name: string) => {
        ws.send(JSON.stringify({
            name
        }));
    }} onChange={() => {
        console.log('change?');
    }} />;
};
