function* color() {
    const colors = ['magenta', 'cyan', 'blue', 'yellow', 'green', 'red'];
    let current = 0;
    while (true) {
        if (current === colors.length) {
            current = 0;
        }
        yield colors[current++];
    }
}

const colorGenerator = color();
/**
 *
 * @returns a color string cycling through a fixed set of
 * colors: ['magenta', 'cyan', 'blue', 'yellow', 'green', 'red']
 */
export const nextColor = () => colorGenerator.next().value;
