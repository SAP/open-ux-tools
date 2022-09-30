import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IStyleFunction, ILabelStyles } from '@fluentui/react';
import { Label } from '@fluentui/react';
import type { UILabelProps } from '../../../src/components/UILabel';
import { UILabel } from '../../../src/components/UILabel';

describe('<UILabel />', () => {
    let wrapper: Enzyme.ReactWrapper<UILabelProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(<UILabel>Dummy</UILabel>);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UIToggle component', () => {
        expect(wrapper.find('.ms-Label').length).toEqual(1);
    });

    it('Styles', () => {
        const styles = (wrapper.find(Label).props().styles as IStyleFunction<{}, {}>)({}) as ILabelStyles;
        expect(styles.root).toMatchInlineSnapshot(
            {},
            `
            Array [
              Object {
                "color": "var(--vscode-input-foreground)",
                "fontFamily": "var(--vscode-font-family)",
                "fontSize": "13px",
                "fontWeight": "bold",
                "marginTop": 25,
                "padding": "4px 0",
              },
              undefined,
              undefined,
            ]
        `
        );
    });
});
