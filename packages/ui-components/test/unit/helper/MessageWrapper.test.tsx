import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { MessageWrapperProps } from '../../../src/helper/ValidationMessage';
import { MessageWrapper, getMessageInfo } from '../../../src/helper/ValidationMessage';

describe('<MessageWrapper />', () => {
    let renderResult: ReturnType<typeof render>;

    const messageInfo = getMessageInfo({
        warningMessage: 'dummy'
    });

    beforeEach(() => {
        renderResult = render(
            <MessageWrapper message={messageInfo}>
                <div className="dummyInput"></div>
            </MessageWrapper>
        );
    });

    afterEach(() => {
        renderResult.unmount();
    });

    it('Should render a MessageWrapper component', () => {
        const { container } = renderResult;
        expect(container.querySelectorAll('.dummyInput').length).toEqual(1);
        expect(container.querySelectorAll('.ts-message-wrapper').length).toEqual(1);
        expect(container.querySelectorAll('.ts-message-wrapper--warning').length).toEqual(1);
    });

    it('Default message - error', () => {
        const messageTemp = JSON.parse(JSON.stringify(messageInfo));
        messageTemp.type = undefined;
        renderResult.rerender(
            <MessageWrapper message={messageTemp}>
                <div className="dummyInput"></div>
            </MessageWrapper>
        );
        const { container } = renderResult;
        expect(container.querySelectorAll('.ts-message-wrapper--error').length).toEqual(1);
    });

    it('Info message', () => {
        const messageTemp = getMessageInfo({
            infoMessage: 'dummy'
        });
        renderResult.rerender(
            <MessageWrapper message={messageTemp}>
                <div className="dummyInput"></div>
            </MessageWrapper>
        );
        const { container } = renderResult;
        expect(container.querySelectorAll('.ts-message-wrapper--info').length).toEqual(1);
    });
});
