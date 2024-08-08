import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { QuestionGroup } from '../../../src/components/QuestionGroup';
import type { QuestionGroupProps } from '../../../src/components/QuestionGroup';
import { Question } from '../../../dist';
import { questions } from '../../mock-data/questions';

describe('QuestionGroup', () => {
    initIcons();

    const props: QuestionGroupProps = {
        title: 'Group Title',
        description: ['Group', 'description'],
        showDescription: false,
        children: []
    };

    it('Render question group', async () => {
        render(<QuestionGroup {...props} />);
        expect(screen.getByText('Group Title')).toBeDefined();
        expect(screen.queryAllByText('Group')).toHaveLength(0);
        expect(screen.queryAllByText('description')).toHaveLength(0);
    });

    it('Test question group - show description', async () => {
        render(<QuestionGroup {...props} showDescription={true} description={['Group', 'description']} />);
        expect(screen.getByText('Group Title')).toBeDefined();
        expect(screen.getByText('Group')).toBeDefined();
        expect(screen.getByText('description')).toBeDefined();
    });

    it('Test property "id"', async () => {
        render(<QuestionGroup {...props} id="test-id" />);
        expect(document.getElementById('test-id')).not.toBeNull();
    });

    it('Test question group - children', async () => {
        render(
            <QuestionGroup {...props}>
                {Object.values(questions).map((question) => (
                    <Question
                        key={question.name}
                        answers={{}}
                        validation={{}}
                        onChange={jest.fn()}
                        question={question}
                    />
                ))}
            </QuestionGroup>
        );
        expect(screen.getByText('Group Title')).toBeDefined();
        expect(document.getElementsByClassName('prompt-entry')).toHaveLength(4);
    });
});
