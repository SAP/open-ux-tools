import * as React from 'react';
import { render } from '@testing-library/react';
import { UILoadButton } from '../../../../src/components/UITranslationInput/UILoadButton';

describe('<UILoadButton />', () => {
    let onClick: jest.Mock;
    const loaderClassName = 'loading-button';
    const selectors = {
        button: '.ms-Button',
        loader: '.ms-Spinner'
    };

    const isLoading = (): boolean => {
        return !!document.querySelectorAll(selectors.loader).length;
    };

    beforeEach(() => {
        onClick = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should render a LoadButton component', () => {
        const { container } = render(<UILoadButton onClick={onClick} />);
        expect(container.querySelectorAll(selectors.button).length).toEqual(1);
    });

    const testCases = [undefined, 'dummy'];
    for (const testCase of testCases) {
        it(`Test busy loader with className="${testCase}"`, () => {
            const { container } = render(<UILoadButton onClick={onClick} className={testCase} busy={true} />);
            const buttonClasses = container.querySelector(selectors.button)?.classList;
            if (testCase) {
                expect(buttonClasses?.contains(testCase)).toEqual(true);
            }
            expect(buttonClasses?.contains(loaderClassName)).toEqual(true);
        });
    }

    it(`Test busy loader without "useMinWaitingTime"`, () => {
        const { rerender } = render(<UILoadButton onClick={onClick} busy={true} />);
        expect(isLoading()).toEqual(true);
        rerender(<UILoadButton onClick={onClick} busy={false} />);
        expect(isLoading()).toEqual(false);
    });

    describe('Test "useMinWaitingTime"', () => {
        let setTimeoutSpy: jest.SpyInstance;
        let clearTimeoutSpy: jest.SpyInstance;

        beforeEach(() => {
            setTimeoutSpy = jest.spyOn(window, 'setTimeout');
            clearTimeoutSpy = jest.spyOn(window, 'setTimeout');
        });

        it('Release in timeout', () => {
            expect(setTimeoutSpy).toHaveBeenCalledTimes(0);
            const { rerender } = render(<UILoadButton onClick={onClick} busy={true} useMinWaitingTime={true} />);
            expect(isLoading()).toEqual(true);
            expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
            expect(setTimeoutSpy.mock.calls[0][1]).toEqual(500);
            // Try to release loader - it still should busy, because min waiting time was not completed
            rerender(<UILoadButton onClick={onClick} busy={false} useMinWaitingTime={true} />);
            expect(isLoading()).toEqual(true);
            // Simulate timeout handler
            setTimeoutSpy.mock.calls[0][0]();
            expect(isLoading()).toEqual(false);
        });

        it('Release after timeout', () => {
            expect(setTimeoutSpy).toHaveBeenCalledTimes(0);
            const { rerender } = render(<UILoadButton onClick={onClick} busy={true} useMinWaitingTime={true} />);
            expect(isLoading()).toEqual(true);
            expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
            expect(setTimeoutSpy.mock.calls[0][1]).toEqual(500);
            // Simulate timeout handler
            setTimeoutSpy.mock.calls[0][0]();
            expect(isLoading()).toEqual(true);
            // Try to release loader - it still should busy, because min waiting time was not completed
            rerender(<UILoadButton onClick={onClick} busy={false} useMinWaitingTime={true} />);
            expect(isLoading()).toEqual(false);
        });

        it('Unmount', () => {
            expect(setTimeoutSpy).toHaveBeenCalledTimes(0);
            const { unmount } = render(<UILoadButton onClick={onClick} busy={true} useMinWaitingTime={true} />);
            expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
            // Simulate timeout handler
            unmount();
            expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
        });

        it('Custom waiting time', () => {
            const useMinWaitingTime = 200;
            expect(setTimeoutSpy).toHaveBeenCalledTimes(0);
            render(<UILoadButton onClick={onClick} busy={true} useMinWaitingTime={useMinWaitingTime} />);
            expect(isLoading()).toEqual(true);
            expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
            expect(setTimeoutSpy.mock.calls[0][1]).toEqual(useMinWaitingTime);
        });
    });
});
