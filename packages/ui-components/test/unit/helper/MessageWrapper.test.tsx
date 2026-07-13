import * as React from 'react';
import { render } from '@testing-library/react';
import type { MessageWrapperProps } from '../../../src/helper/ValidationMessage';
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
        expect(container.querySelectorAll('.dummyInput').length).toEqual(1);
        expect(container.querySelectorAll('.ts-message-wrapper').length).toEqual(1);
        expect(container.querySelectorAll('.ts-message-wrapper--warning').length).toEqual(1);
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
        expect(container.querySelectorAll('.ts-message-wrapper--error').length).toEqual(1);
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
        expect(container.querySelectorAll('.ts-message-wrapper--info').length).toEqual(1);
    });
});
