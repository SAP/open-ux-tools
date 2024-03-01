import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IIconProps } from '@fluentui/react';
import { Icon } from '@fluentui/react';
import { UIIcon } from '../../../src/components/UIIcon';

describe('<UIIcon />', () => {
    let wrapper: Enzyme.ReactWrapper<IIconProps>;
    const globalClassNames = {
        root: 'ts-icon'
    };

    beforeEach(() => {
        wrapper = Enzyme.mount(<UIIcon />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UIIcon component', () => {
        expect(wrapper.find(Icon).prop('className')).toEqual(globalClassNames.root);
    });

    it('Property "classname"', () => {
        wrapper.setProps({
            className: 'dummy'
        });
        expect(wrapper.find(Icon).prop('className')).toEqual(`${globalClassNames.root} dummy`);
    });
});
