import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { Questions } from '../../../src/components';

describe('Questions', () => {
    initIcons();

    it('Render questions', async () => {
        render(
            <Questions
                answers={{}}
                choices={{}}
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
});
