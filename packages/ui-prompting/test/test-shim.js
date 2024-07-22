/**
 * Get rids of the missing requestAnimationFrame polyfill warning.
 *
 * @link https://reactjs.org/docs/javascript-environment-requirements.html
 * @copyright 2004-present Facebook. All Rights Reserved.
 */
global.requestAnimationFrame = function (callback) {
    setTimeout(callback, 0);
};

/**
 * Mock for "structuredClone" function.
 */
global.structuredClone = (value) => {
    return JSON.parse(JSON.stringify(value));
};
