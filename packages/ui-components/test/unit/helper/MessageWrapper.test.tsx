import * as React from 'react';
import { render } from '@testing-library/react';
import { MessageWrapper, getMessageInfo } from '../../../src/helper/ValidationMessage';

describe('<MessageWrapper />', () => {
    const messageInfo = getMessageInfo({
        warningMessage: 'dummy'
    });

    it('Should render a MessageWrapper component', () => {
        const { container } = render(
            <MessageWrapper message={messageInfo}>
                <div className="dummyInput"></div>
            </MessageWrapper>
        );
        expect(container.querySelectorAll('.dummyInput')).toHaveLength(1);
        expect(container.querySelectorAll('.ts-message-wrapper')).toHaveLength(1);
        expect(container.querySelectorAll('.ts-message-wrapper--warning')).toHaveLength(1);
    });

    it('Default message - error', () => {
        const messageTemp = JSON.parse(JSON.stringify(messageInfo));
        messageTemp.type = undefined;
        const { container, rerender } = render(
            <MessageWrapper message={messageInfo}>
                <div className="dummyInput"></div>
            </MessageWrapper>
        );
        rerender(
            <MessageWrapper message={messageTemp}>
                <div className="dummyInput"></div>
            </MessageWrapper>
        );
        expect(container.querySelectorAll('.ts-message-wrapper--error')).toHaveLength(1);
    });

    it('Info message', () => {
        const messageTemp = getMessageInfo({
            infoMessage: 'dummy'
        });
        const { container, rerender } = render(
            <MessageWrapper message={messageInfo}>
                <div className="dummyInput"></div>
            </MessageWrapper>
        );
        rerender(
            <MessageWrapper message={messageTemp}>
                <div className="dummyInput"></div>
            </MessageWrapper>
        );
        expect(container.querySelectorAll('.ts-message-wrapper--info')).toHaveLength(1);
    });
});
