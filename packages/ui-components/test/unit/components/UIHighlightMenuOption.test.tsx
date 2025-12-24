import * as React from 'react';
import { render } from '@testing-library/react';
import type { UIHighlightMenuOptionProps } from '../../../src/components/UIContextualMenu/UIHighlightMenuOption';
import { UIHighlightMenuOption } from '../../../src/components/UIContextualMenu/UIHighlightMenuOption';

describe('<UIHighlightMenuOption />', () => {
    const hidlightSelector = '.ts-Menu-option--highlighted';

    it('Should render a ComboboxSearchOption component', () => {
        const text = 'Dummy Text';
        const { container } = render(<UIHighlightMenuOption text={text} />);
        expect(container.querySelector('.ts-Menu-option')).toHaveTextContent(text);
    });

    it('Check search highlighting', () => {
        const text = 'Test query 12321';
        // Single occureance
        let query = 'q';
        let { container } = render(<UIHighlightMenuOption text={text} query={query} />);
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(1);
        expect(container.querySelector(hidlightSelector)).toHaveTextContent(query);

        // Multiple occureance
        ({ container } = render(<UIHighlightMenuOption text={text} query="e" />));
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(2);

        // One larger query
        query = 'er';
        ({ container } = render(<UIHighlightMenuOption text={text} query={query} />));
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(1);
        expect(container.querySelector(hidlightSelector)).toHaveTextContent(query);

        // Case insensitive
        ({ container } = render(<UIHighlightMenuOption text={text} query="EST" />));
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(1);
        expect(container.querySelector(hidlightSelector)).toHaveTextContent('est');

        // Beginning
        ({ container } = render(<UIHighlightMenuOption text={text} query="te" />));
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(1);
        expect(container.querySelector(hidlightSelector)).toHaveTextContent('Te');

        // Ending
        ({ container } = render(<UIHighlightMenuOption text={text} query="21" />));
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(1);

        // No occureance
        ({ container } = render(<UIHighlightMenuOption text={text} query="404" />));
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(0);
    });

    it('Continues occuriences - same combination', () => {
        const text = 'Dummmmmmmmyyyyyy';
        const query = 'mm';
        const { container } = render(<UIHighlightMenuOption text={text} query={query} />);
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(4);
    });

    it('Continues occuriences - different combination', () => {
        const text = 'Dudududummy';
        let query = 'du';
        let { container } = render(<UIHighlightMenuOption text={text} query={query} />);
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(4);

        // Append more
        query = 'dud';
        ({ container } = render(<UIHighlightMenuOption text={text} query={query} />));
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(2);

        // Append one more
        query = 'dudu';
        ({ container } = render(<UIHighlightMenuOption text={text} query={query} />));
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(2);

        // And one more
        query = 'dudud';
        ({ container } = render(<UIHighlightMenuOption text={text} query={query} />));
        expect(container.querySelectorAll(hidlightSelector)).toHaveLength(1);
    });
});
