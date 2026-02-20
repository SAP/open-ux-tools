import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { TFunction } from 'i18next';
import {
    useTextInputOverflow,
    getUrlErrorMessage
} from '../../../../../../src/components/layout/main/systemInfo/utils';

describe('systemInfo utils', () => {
    describe('getUrlErrorMessage', () => {
        const mockT = ((key: string) => key) as TFunction;

        it('should return undefined for valid URL without pathname', () => {
            const result = getUrlErrorMessage('https://example.com', mockT);
            expect(result).toBeUndefined();
        });

        it('should return undefined for valid URL with root pathname', () => {
            const result = getUrlErrorMessage('https://example.com/', mockT);
            expect(result).toBeUndefined();
        });

        it('should return error message for URL with pathname when not odata_service', () => {
            const result = getUrlErrorMessage('https://example.com/path', mockT, 'abap_catalog');
            expect(result).toBe('validations.systemUrlOriginOnlyWarning');
        });

        it('should return undefined for URL with pathname when connectionType is odata_service', () => {
            const result = getUrlErrorMessage('https://example.com/path', mockT, 'odata_service');
            expect(result).toBeUndefined();
        });

        it('should return undefined for invalid URL', () => {
            const result = getUrlErrorMessage('invalid-url', mockT);
            expect(result).toBeUndefined();
        });
    });

    describe('useTextInputOverflow', () => {
        let mockInputElement: HTMLInputElement;

        // Test component that uses the hook
        const TestComponent: React.FC<{
            inputId: string;
            value: string | undefined;
            onStateChange?: (state: {
                isEditing: boolean;
                isOverflowing: boolean;
                onEditStart: () => void;
                onEditEnd: () => void;
            }) => void;
        }> = ({ inputId, value, onStateChange }) => {
            const hookResult = useTextInputOverflow(inputId, value);

            React.useEffect(() => {
                if (onStateChange) {
                    onStateChange(hookResult);
                }
            }, [hookResult, onStateChange]);

            return (
                <div data-testid="hook-state">
                    <span data-testid="is-editing">{hookResult.isEditing.toString()}</span>
                    <span data-testid="is-overflowing">{hookResult.isOverflowing.toString()}</span>
                    <button data-testid="start-editing" onClick={hookResult.onEditStart}>
                        Start
                    </button>
                    <button data-testid="stop-editing" onClick={hookResult.onEditEnd}>
                        Stop
                    </button>
                </div>
            );
        };

        beforeEach(() => {
            // Create a mock input element
            mockInputElement = document.createElement('input');
            mockInputElement.id = 'test-input';
            document.body.appendChild(mockInputElement);

            // Mock ResizeObserver
            global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
                observe: jest.fn(),
                disconnect: jest.fn(),
                unobserve: jest.fn()
            })) as any;

            // Mock requestAnimationFrame
            global.requestAnimationFrame = jest.fn((callback) => {
                callback(0);
                return 0;
            }) as any;

            jest.useFakeTimers();
        });

        afterEach(() => {
            document.body.removeChild(mockInputElement);
            jest.clearAllTimers();
            jest.useRealTimers();
            jest.clearAllMocks();
        });

        it('should initialize with default state', () => {
            const { getByTestId } = render(<TestComponent inputId="test-input" value="test value" />);

            expect(getByTestId('is-editing')).toHaveTextContent('false');
            expect(getByTestId('is-overflowing')).toHaveTextContent('false');
        });

        it('should set isEditing to true when onEditStart is called', () => {
            const { getByTestId } = render(<TestComponent inputId="test-input" value="test value" />);

            const startButton = getByTestId('start-editing');
            startButton.click();

            expect(getByTestId('is-editing')).toHaveTextContent('true');
        });

        it('should set isEditing to false when onEditEnd is called', () => {
            const { getByTestId } = render(<TestComponent inputId="test-input" value="test value" />);

            const startButton = getByTestId('start-editing');
            const stopButton = getByTestId('stop-editing');

            startButton.click();
            expect(getByTestId('is-editing')).toHaveTextContent('true');

            stopButton.click();
            expect(getByTestId('is-editing')).toHaveTextContent('false');
        });

        it('should detect text overflow when scrollWidth > clientWidth', async () => {
            // Mock the element dimensions to simulate overflow
            Object.defineProperty(mockInputElement, 'scrollWidth', {
                configurable: true,
                value: 200
            });
            Object.defineProperty(mockInputElement, 'clientWidth', {
                configurable: true,
                value: 100
            });

            const { getByTestId } = render(<TestComponent inputId="test-input" value="test value" />);

            // Fast-forward initial timeout
            jest.advanceTimersByTime(0);

            await waitFor(() => {
                expect(getByTestId('is-overflowing')).toHaveTextContent('true');
            });
        });

        it('should not detect overflow when scrollWidth <= clientWidth', async () => {
            // Mock the element dimensions - no overflow
            Object.defineProperty(mockInputElement, 'scrollWidth', {
                configurable: true,
                value: 100
            });
            Object.defineProperty(mockInputElement, 'clientWidth', {
                configurable: true,
                value: 200
            });

            const { getByTestId } = render(<TestComponent inputId="test-input" value="test value" />);

            // Fast-forward initial timeout
            jest.advanceTimersByTime(0);

            await waitFor(() => {
                expect(getByTestId('is-overflowing')).toHaveTextContent('false');
            });
        });

        it('should recheck overflow when value changes', async () => {
            Object.defineProperty(mockInputElement, 'scrollWidth', {
                writable: true,
                configurable: true,
                value: 100
            });
            Object.defineProperty(mockInputElement, 'clientWidth', {
                writable: true,
                configurable: true,
                value: 200
            });

            const { getByTestId, rerender } = render(<TestComponent inputId="test-input" value="short" />);

            jest.advanceTimersByTime(0);

            await waitFor(() => {
                expect(getByTestId('is-overflowing')).toHaveTextContent('false');
            });

            // Change value to simulate longer text causing overflow
            Object.defineProperty(mockInputElement, 'scrollWidth', {
                writable: true,
                configurable: true,
                value: 300
            });

            rerender(<TestComponent inputId="test-input" value="much longer text that will overflow" />);

            jest.advanceTimersByTime(0);

            await waitFor(() => {
                expect(getByTestId('is-overflowing')).toHaveTextContent('true');
            });
        });

        it('should handle window resize events with debouncing', async () => {
            Object.defineProperty(mockInputElement, 'scrollWidth', {
                writable: true,
                configurable: true,
                value: 100
            });
            Object.defineProperty(mockInputElement, 'clientWidth', {
                writable: true,
                configurable: true,
                value: 200
            });

            const { getByTestId } = render(<TestComponent inputId="test-input" value="test value" />);

            jest.advanceTimersByTime(0);

            // Simulate window resize that causes overflow
            Object.defineProperty(mockInputElement, 'clientWidth', {
                writable: true,
                configurable: true,
                value: 50
            });

            window.dispatchEvent(new Event('resize'));

            // Should be debounced - not updated yet
            expect(getByTestId('is-overflowing')).toHaveTextContent('false');

            // Fast-forward past debounce delay (100ms)
            jest.advanceTimersByTime(100);

            await waitFor(() => {
                expect(getByTestId('is-overflowing')).toHaveTextContent('true');
            });
        });

        it('should debounce multiple rapid window resize events', async () => {
            const rafSpy = jest.spyOn(global, 'requestAnimationFrame');

            render(<TestComponent inputId="test-input" value="test value" />);

            jest.advanceTimersByTime(0);

            // Clear initial requestAnimationFrame call from setup
            rafSpy.mockClear();

            // Trigger multiple resize events rapidly
            window.dispatchEvent(new Event('resize'));
            jest.advanceTimersByTime(50);
            window.dispatchEvent(new Event('resize'));
            jest.advanceTimersByTime(50);
            window.dispatchEvent(new Event('resize'));

            // Should still be waiting for debounce
            expect(rafSpy).not.toHaveBeenCalled();

            // Fast-forward past final debounce delay
            jest.advanceTimersByTime(100);

            // Should only call once after all rapid events
            await waitFor(() => {
                expect(rafSpy).toHaveBeenCalledTimes(1);
            });

            rafSpy.mockRestore();
        });

        it('should handle missing input element gracefully', () => {
            const { getByTestId } = render(<TestComponent inputId="non-existent-input" value="test value" />);

            jest.advanceTimersByTime(0);

            // Should not crash and should remain in default state
            expect(getByTestId('is-editing')).toHaveTextContent('false');
            expect(getByTestId('is-overflowing')).toHaveTextContent('false');
        });

        it('should handle ResizeObserver not being available', () => {
            // Remove ResizeObserver
            const originalResizeObserver = global.ResizeObserver;
            (global as any).ResizeObserver = undefined;

            const { getByTestId } = render(<TestComponent inputId="test-input" value="test value" />);

            jest.advanceTimersByTime(0);

            // Should not crash
            expect(getByTestId('is-editing')).toHaveTextContent('false');
            expect(getByTestId('is-overflowing')).toHaveTextContent('false');

            // Restore
            global.ResizeObserver = originalResizeObserver;
        });

        it('should cleanup on unmount', () => {
            const disconnectMock = jest.fn();
            const observeMock = jest.fn();

            global.ResizeObserver = jest.fn().mockImplementation(() => ({
                observe: observeMock,
                disconnect: disconnectMock,
                unobserve: jest.fn()
            })) as any;

            const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

            const { unmount } = render(<TestComponent inputId="test-input" value="test value" />);

            jest.advanceTimersByTime(0);

            unmount();

            // Should disconnect ResizeObserver
            expect(disconnectMock).toHaveBeenCalled();

            // Should remove window resize listener
            expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

            removeEventListenerSpy.mockRestore();
        });

        it('should clear timeouts on unmount', () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            const { unmount } = render(<TestComponent inputId="test-input" value="test value" />);

            unmount();

            // Should clear timeouts (initial check and resize debounce)
            expect(clearTimeoutSpy).toHaveBeenCalled();

            clearTimeoutSpy.mockRestore();
        });
    });
});
