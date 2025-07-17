// This file ensures jest-dom matchers are available globally for all tests.
import '@testing-library/jest-dom/extend-expect';
import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveTextContent(text: string): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeChecked(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveValue(value: string | number): R;
      toHaveDisplayValue(value: string | string[]): R;
      toBeRequired(): R;
      toBeInvalid(): R;
      toBeValid(): R;
      toHaveStyle(css: object | string): R;
      toHaveFocus(): R;
      toHaveFormValues(values: object): R;
      toBePartiallyChecked(): R;
      toHaveDescription(text?: string): R;
      toHaveAccessibleDescription(text?: string): R;
      toHaveAccessibleName(text?: string): R;
      toBeEmptyDOMElement(): R;
      toContainElement(element: HTMLElement | SVGElement | null): R;
      toContainHTML(htmlText: string): R;
      toHaveErrorMessage(text?: string): R;
    }
  }
}
