import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { IQuestion, Questions } from '../../../src/components';

describe('Questions', () => {
    initIcons();

    it('Render questions', async () => {
        render(
            <Questions
                answers={{}}
                choices={{}}
                validation={{}}
                onChange={jest.fn()}
                onChoiceRequest={jest.fn()}
                questions={[
                    {
                        type: 'input',
                        name: 'test',
                        // ToDo - remove
                        selectType: 'static'
                    }
                ]}
            />
        );
        expect(screen.getByText('test')).toBeDefined();
    });

    it('Dynamic questions', async () => {
        const onChoiceRequest = jest.fn();
        const dynamicQuestion1: IQuestion = {
            type: 'list',
            name: 'test1',
            selectType: 'dynamic'
        };
        const dynamicQuestion2 = {
            ...dynamicQuestion1,
            name: 'test2'
        };
        const dynamicQuestion3 = {
            ...dynamicQuestion1,
            name: 'test3'
        };

        const { rerender } = render(
            <Questions
                answers={{}}
                choices={{}}
                validation={{}}
                onChange={jest.fn()}
                onChoiceRequest={onChoiceRequest}
                questions={[dynamicQuestion1, dynamicQuestion2]}
            />
        );
        // Render with initial questions
        expect(onChoiceRequest).toBeCalledTimes(1);
        expect(onChoiceRequest).toBeCalledWith(['test1', 'test2'], {});
        onChoiceRequest.mockReset();
        // Rereneder with same questions, but with new reference
        rerender(
            <Questions
                answers={{}}
                choices={{}}
                validation={{}}
                onChange={jest.fn()}
                onChoiceRequest={onChoiceRequest}
                questions={[dynamicQuestion2, dynamicQuestion1]}
            />
        );
        expect(onChoiceRequest).toBeCalledTimes(0);
        // Rereneder with new question
        rerender(
            <Questions
                answers={{}}
                choices={{}}
                validation={{}}
                onChange={jest.fn()}
                onChoiceRequest={onChoiceRequest}
                questions={[
                    dynamicQuestion1, dynamicQuestion2, dynamicQuestion3
                ]}
            />
        );
        expect(onChoiceRequest).toBeCalledTimes(1);
        expect(onChoiceRequest).toBeCalledWith(['test1', 'test2', 'test3'], {});
    });
});
