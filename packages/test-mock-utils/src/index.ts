export function sortIntegers(numbers: number[]): number[] {
    return numbers.slice().sort((a, b) => a - b);
}
