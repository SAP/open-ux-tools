import * as React from 'react';
import * as Enzyme from 'enzyme';

import type { UIPersonaProps } from '../../../src/components/UIPersona';
import { UIPersona, UIPersonaSize } from '../../../src/components/UIPersona';

describe('<UIPersona />', () => {
    let wrapper: Enzyme.ReactWrapper<UIPersonaProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(<UIPersona text="John Doe" size={UIPersonaSize.size72} />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UIPersona component', () => {
        expect(wrapper.find('.ms-Persona').length).toEqual(1);
        expect(wrapper.find('.ms-Persona--size72').length).toEqual(2);
    });
});
