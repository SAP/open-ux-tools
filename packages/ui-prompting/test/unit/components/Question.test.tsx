import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { Question } from '../../../src/components';
import { questions } from '../../mock-data/questions';

describe('Question', () => {
    initIcons();

    for (const prompt of questions) {
        it(`Render prompt - ${prompt.question.name}`, () => {
            render(<Question {...prompt} />);
            expect(screen.getByText(prompt.question.name || '')).toBeDefined();
        });

        it('Render question - onChange', () => {
            const onChange = jest.fn();
            render(<Question {...questions[0]} onChange={onChange} />);
            const input = screen.getByLabelText(questions[0].question.name || '');
            fireEvent.change(input, { target: { value: 'new value' } });
            expect(onChange).toHaveBeenCalled();
        });

        it('Render question - pending', () => {
            const { container } = render(<Question {...questions[1]} pending={true} />);
            expect(container.getElementsByClassName('ms-Spinner-circle')).toHaveLength(1);
        });
    }
});
