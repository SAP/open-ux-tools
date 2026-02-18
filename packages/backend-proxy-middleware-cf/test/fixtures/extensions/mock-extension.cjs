module.exports = {
    insertMiddleware: {
        beforeRequest: [
            function handler(_req, _res, next, params) {
                if (params && typeof next === 'function') {
                    next();
                }
            },
            {
                path: '/custom-route',
                handler: function (_req, _res, next) {
                    if (typeof next === 'function') next();
                }
            }
        ]
    }
};
