import * as matchers from '../matchers';

if (expect !== undefined) {
    expect.extend(matchers);
} else {
    throw new Error("Cannot find Jest's global expect. Check if you have correctly installed the matchers");
}
