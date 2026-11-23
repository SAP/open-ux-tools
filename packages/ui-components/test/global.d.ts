import '@testing-library/jest-dom';

declare global {
    namespace jest {
        interface Matchers<R> {
            // Custom matcher for UIDropdown utils
            isDropdownEmpty(props: Partial<any>): R;
        }
    }
}
