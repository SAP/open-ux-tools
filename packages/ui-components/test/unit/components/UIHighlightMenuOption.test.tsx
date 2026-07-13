import * as React from 'react';
import { render } from '@testing-library/react';
import type { UIHighlightMenuOptionProps } from '../../../src/components/UIContextualMenu/UIHighlightMenuOption';
import { UIHighlightMenuOption } from '../../../src/components/UIContextualMenu/UIHighlightMenuOption';

describe('<UIHighlightMenuOption />', () => {
    const highlightSelector = '.ts-Menu-option--highlighted';

    it('Should render a ComboboxSearchOption component', () => {
        const text = 'Dummy Text';
        const { container } = render(<UIHighlightMenuOption text={text} />);
        expect(container.querySelector('.ts-Menu-option')?.textContent).toEqual(text);
    });

    it('Check search highlighting', () => {
        const text = 'Test query 12321';
        const props: UIHighlightMenuOptionProps = { text, query: 'q' };
        const { container, rerender } = render(<UIHighlightMenuOption {...props} />);

        // Single occurrence
        expect(container.querySelectorAll(highlightSelector).length).toEqual(1);
        expect(container.querySelector(highlightSelector)?.textContent).toEqual('q');

        // Multiple occurrences
        rerender(<UIHighlightMenuOption text={text} query="e" />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(2);

        // One larger query
        rerender(<UIHighlightMenuOption text={text} query="er" />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(1);
        expect(container.querySelector(highlightSelector)?.textContent).toEqual('er');

        // Case insensitive
        rerender(<UIHighlightMenuOption text={text} query="EST" />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(1);
        expect(container.querySelector(highlightSelector)?.textContent).toEqual('est');

        // Beginning
        rerender(<UIHighlightMenuOption text={text} query="te" />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(1);
        expect(container.querySelector(highlightSelector)?.textContent).toEqual('Te');

        // Ending
        rerender(<UIHighlightMenuOption text={text} query="21" />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(1);

        // No occurrence
        rerender(<UIHighlightMenuOption text={text} query="404" />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(0);
    });

    it('Continues occurrences - same combination', () => {
        const text = 'Dummmmmmmmyyyyyy';
        const query = 'mm';
        const { container } = render(<UIHighlightMenuOption text={text} query={query} />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(4);
    });

    it('Continues occurrences - different combination', () => {
        const text = 'Dudududummy';
        const { container, rerender } = render(<UIHighlightMenuOption text={text} query="du" />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(4);

        // Append more
        rerender(<UIHighlightMenuOption text={text} query="dud" />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(2);

        // Append one more
        rerender(<UIHighlightMenuOption text={text} query="dudu" />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(2);

        // And one more
        rerender(<UIHighlightMenuOption text={text} query="dudud" />);
        expect(container.querySelectorAll(highlightSelector).length).toEqual(1);
    });
});
