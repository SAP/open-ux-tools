import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { QuestionGroup } from '../../../src/components/QuestionGroup';
import { Question } from '../../../dist';

describe('QuestionGroup', () => {
    initIcons();

    it('Render question groups', async () => {
        const { rerender } = render(
            <QuestionGroup
                title="Group Title"
                description={['Group Description']}
                showDescription={true}
                children={[]}
            />
        );
        expect(screen.getByText('Group Title')).toBeDefined();
        expect(screen.getByText('Group Description')).toBeDefined();
        rerender(
            <QuestionGroup
                title="Group Title"
                description={['Group Description']}
                showDescription={false}
                children={[]}
            />
        );
        expect(screen.queryAllByText('Group Description')).toHaveLength(0);
    });

    it('Render question group children', async () => {
        render(
            <QuestionGroup
                title="Group Title"
                showDescription={false}
                children={[
                    <Question
                        answers={{}}
                        validation={{}}
                        onChange={jest.fn()}
                        question={{
                            type: 'input',
                            name: 'testQuestionInput'
                        }}
                    />
                ]}
            />
        );
        expect(screen.getByText('Group Title')).toBeDefined();
        expect(screen.getByText('testQuestionInput')).toBeDefined();
    });
});
