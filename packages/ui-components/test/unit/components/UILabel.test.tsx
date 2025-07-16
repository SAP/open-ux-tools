import * as React from 'react';
import { render } from '@testing-library/react';
import type { ILabelStyles } from '@fluentui/react';
import { UILabel } from '../../../src/components/UILabel';

// Test helper class to access protected methods
class UILabelTestHelper extends UILabel {
    public getStyles(): ILabelStyles {
        const labelStyles = (this.render() as any).props.styles;
        return labelStyles({});
    }
}

describe('<UILabel />', () => {
    it('Should render a UILabel component', () => {
        const { container } = render(<UILabel>Dummy</UILabel>);
        expect(container.querySelector('.ms-Label')).toBeTruthy();
    });

    it('Styles', () => {
        const testInstance = new UILabelTestHelper({ children: 'Dummy' });
        const styles = testInstance.getStyles();
        expect(styles.root).toMatchInlineSnapshot(
            {},
            `
            Array [
              Object {
                "color": "var(--vscode-input-foreground)",
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
