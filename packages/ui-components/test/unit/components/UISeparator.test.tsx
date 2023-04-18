import * as React from 'react';
import * as Enzyme from 'enzyme';

import type { UISeparatorProps } from '../../../src/components/UISeparator';
import { UISeparator } from '../../../src/components/UISeparator';

describe('<UISeparator />', () => {
    let wrapper: Enzyme.ReactWrapper<UISeparatorProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(<UISeparator />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UISeparator component', () => {
        expect(wrapper.find({ role: 'separator' }).length).toEqual(1);
    });
});
