import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ServiceKey } from '../../../../../../src/components/layout/main/systemInfo/ServiceKey';

describe('<ServiceKey />', () => {
    it('Test input', () => {
        render(<ServiceKey serviceKey="service-key-content" />);
        expect(document.querySelector('.ms-TextField-field')).toHaveValue('service-key-content');
    });
});
