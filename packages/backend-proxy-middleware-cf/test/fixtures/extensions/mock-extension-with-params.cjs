module.exports = {
    insertMiddleware: {
        beforeRequest: [
            function handler(_req, _res, next) {
                if (typeof next === 'function') next();
            }
        ]
    }
};
