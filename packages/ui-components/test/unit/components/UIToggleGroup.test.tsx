import * as React from 'react';
import * as Enzym from 'enzyme';

import { UIToggleGroup } from '../../../src/components/UIToggleGroup/index';
import type { UIToggleGroupProps } from '../../../src/components/UIToggleGroup/index';

describe('<UIToggleGroup />', () => {
    let toggleGroupProps: UIToggleGroupProps;
    let toggleGroupInstance: UIToggleGroup;
    let wrapper: Enzym.ReactWrapper<UIToggleGroupProps, {}, UIToggleGroup>;

    beforeEach(() => {
        toggleGroupProps = Object.freeze({
            options: [
                {
                    key: 'high',
                    text: 'H',
                    ariaLabel: 'High'
                },
                {
                    key: 'medium',
                    text: 'M',
                    ariaLabel: 'Medium'
                },
                {
                    key: 'low',
                    text: 'L',
                    ariaLabel: 'Low'
                }
            ]
        });
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UIToggleGroup component', () => {
        const testProps = Object.assign({}, toggleGroupProps);
        const Proxy = (defaultProps: UIToggleGroupProps): JSX.Element => <UIToggleGroup {...defaultProps} />;
        wrapper = Enzym.mount<UIToggleGroup>(<Proxy {...testProps} />);

        expect(wrapper.find('div.ui-toggle-group').length).toEqual(1);
    });

    it('Should render a UIToggleGroup component with label', () => {
        const testProps = Object.assign({}, toggleGroupProps, {
            label: 'test'
        });
        const Proxy = (defaultProps: UIToggleGroupProps): JSX.Element => <UIToggleGroup {...defaultProps} />;
        wrapper = Enzym.mount<UIToggleGroup>(<Proxy {...testProps} />);

        expect(wrapper.find('label.ui-toggle-group-label').length).toEqual(1);
    });

    it('Should render a UIToggleGroup component with labelId', () => {
        const testProps = Object.assign({}, toggleGroupProps, {
            label: 'test',
            labelId: 'test1',
            ariaLabel: 'ariaTest'
        });
        const Proxy = (defaultProps: UIToggleGroupProps): JSX.Element => <UIToggleGroup {...defaultProps} />;
        wrapper = Enzym.mount<UIToggleGroup>(<Proxy {...testProps} />);

        expect(wrapper.find('div.ui-toggle-group').prop('aria-labelledby')).toEqual('test1');
        expect(wrapper.find('label.ui-toggle-group-label').prop('id')).toEqual('test1');
        expect(wrapper.find('label.ui-toggle-group-label').prop('aria-label')).toEqual('ariaTest');
    });

    it('Should render a UIToggleGroup component - click options', () => {
        const testProps = Object.assign({}, toggleGroupProps, {
            label: 'test',
            labelId: 'test1',
            ariaLabel: 'ariaTest',
            onChange: jest.fn()
        });
        const Proxy = (defaultProps: UIToggleGroupProps): JSX.Element => <UIToggleGroup {...defaultProps} />;
        wrapper = Enzym.mount<UIToggleGroup>(<Proxy {...testProps} />);

        toggleGroupInstance = wrapper.find('UIToggleGroup').instance() as UIToggleGroup;
        const spyOnChange = jest.spyOn(toggleGroupInstance.props, 'onChange');
        expect(wrapper.find('button').length).toEqual(3);

        const btn1 = wrapper.find('button').first();
        btn1.simulate('click');
        expect(spyOnChange).toHaveBeenCalledWith('high', true);
    });

    it('Should render a UIToggleGroup component - focus options', () => {
        const testProps = Object.assign({}, toggleGroupProps, {
            label: 'test',
            labelId: 'test1',
            ariaLabel: 'ariaTest',
            onChange: jest.fn()
        });
        const Proxy = (defaultProps: UIToggleGroupProps): JSX.Element => <UIToggleGroup {...defaultProps} />;
        wrapper = Enzym.mount<UIToggleGroup>(<Proxy {...testProps} />);

        toggleGroupInstance = wrapper.find('UIToggleGroup').instance() as UIToggleGroup;
        const spyOnFocus = jest.spyOn(toggleGroupInstance, 'onFocus');
        toggleGroupInstance.forceUpdate();

        const btn1 = wrapper.find('button').first();
        btn1.simulate('focus', {});

        expect(spyOnFocus).toHaveBeenCalled();
    });

    it('Should render a UIToggleGroup component - blur options', () => {
        const testProps = Object.assign({}, toggleGroupProps, {
            label: 'test',
            labelId: 'test1',
            ariaLabel: 'ariaTest',
            onChange: jest.fn()
        });
        const Proxy = (defaultProps: UIToggleGroupProps): JSX.Element => <UIToggleGroup {...defaultProps} />;
        wrapper = Enzym.mount<UIToggleGroup>(<Proxy {...testProps} />);

        toggleGroupInstance = wrapper.find('UIToggleGroup').instance() as UIToggleGroup;
        const spyOnBlur = jest.spyOn(toggleGroupInstance, 'onBlur');
        toggleGroupInstance.forceUpdate();

        const btn1 = wrapper.find('button').first();
        btn1.simulate('blur', {});

        expect(spyOnBlur).toHaveBeenCalled();
    });
});
