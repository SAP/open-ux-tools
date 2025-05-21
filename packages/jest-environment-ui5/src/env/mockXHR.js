const fs = require('fs');

/**
 * Returns a mock class for XMLHttpRequest.
 * This is used to ensure the proper files are returned.
 * @param {object} globalWindow The global window object.
 * @param {object} pathMappingFn The path mapping function.
 * @param {object} shimmedFilePath The shimmed file paths.
 * @param {object} mockData An object containing file content for the mock.
 * @param {object} XHR The real XMLHttpRequest class.
 * @returns {object} The fake XMLHttpRequest class.
 */
function createMockXHR(globalWindow, pathMappingFn, shimmedFilePath, mockData, XHR) {
    let realXhr = new XHR();

    /**
     * Handles the real XHR send.
     * @param mockXHR The mock XHR object.
     * @param data The data to send.
     */
    function handleRealXHRSend(mockXHR, data) {
        realXhr.addEventListener('load', function () {
            mockXHR.responseText = realXhr.responseText;
            if (mockXHR.listeners['load']) {
                mockXHR.listeners['load']?.({
                    status: 200,
                    responseText: realXhr.responseText
                });
            } else {
                mockXHR['onload']([]);
            }
        });
        if (mockXHR.onload) {
            realXhr.onload = function () {
                mockXHR.responseText = realXhr.responseText;
                if (mockXHR.onload) {
                    mockXHR.onload.apply(realXhr, arguments);
                }
            };
        }

        realXhr.send(data);
    }

    return {
        /**
         * Returns true if cross-site Access-Control requests should be made using credentials such as cookies or authorization headers; otherwise false.
         */
        withCredentials: () => {},
        listeners: {},
        /**
         * Initializes a request.
         * @param {object }type The type of request
         * @param {string} url The URL of the request.
         */
        open: function (type, url) {
            if (url.startsWith('http')) {
                realXhr.open(type, url);
            } else {
                realXhr = undefined;
                if (url.startsWith('./')) {
                    this.url = url;
                } else if (url.endsWith('.js')) {
                    this.url = url.substring(0, url.length - 3);
                } else {
                    this.url = url;
                }
            }
        },
        /**
         * Sends the request.
         * If the request is asynchronous (which is the default), this method returns as soon as the request is sent.
         * @param {string} data The data to send.
         */
        send: function (data) {
            if (realXhr) {
                handleRealXHRSend(this, data);
                return;
            }
            let fileContent = mockData[this.url];
            if (fileContent) {
                this.responseText = fileContent;
            } else {
                let filePath;
                try {
                    filePath = globalWindow.requireFn.resolve(this.url);
                } catch (e) {
                    filePath = '';
                }
                if (!filePath) {
                    filePath = pathMappingFn(this.url);
                }

                if (this.url.endsWith('.json') || this.url.endsWith('.properties') || this.url.endsWith('.xml')) {
                    this.responseText = fs.readFileSync(filePath).toString('utf-8');
                } else {
                    this.responseText = (...args) => {
                        let requireOutput;
                        try {
                            if (shimmedFilePath[this.url]) {
                                requireOutput = new (require('node:vm').Script)(
                                    fs.readFileSync(globalWindow.requireFn.resolve(filePath)).toString('utf-8')
                                ).runInContext(globalWindow);
                            } else {
                                requireOutput = globalWindow.requireFn(filePath);
                            }
                        } catch (e) {
                            // Fallback to the non debug version in case it was requested but doesn't exist
                            if (this.url.endsWith('-dbg')) {
                                const subUrl = this.url.substring(0, this.url.length - 4);
                                const filePath = pathMappingFn(subUrl);
                                requireOutput = globalWindow.requireFn(filePath);
                            } else {
                                throw e;
                            }
                        }

                        return requireOutput;
                    };
                }
            }
            if (this.responseText && (this.responseText.startsWith?.('<?xml') || this.url.endsWith('.xml'))) {
                this.isXML = true;
            }

            if (this.listeners['load']) {
                this.listeners['load']?.({
                    status: 200,
                    responseText: this.responseText
                });
            } else {
                this['onload'].apply(this, []);
            }
        },
        /**
         * Returns all the response headers, separated by CRLF, as a string, or null if no response has been received.
         * @returns {{}|{"Content-Type": string}|string} The response headers.
         */
        getAllResponseHeaders: function () {
            if (realXhr) {
                return realXhr.getAllResponseHeaders();
            }
            if (this.isXML) {
                return 'Content-Type: application/xml; Last-Modified: 2019-08-29T00:00:00.000Z;ETag: NotYolow';
            } else if (this.url.endsWith('json')) {
                return {
                    'Content-Type': 'application/json'
                };
            } else {
                return {};
            }
        },
        /**
         * Returns the string containing the text of the specified header, or null if either the response has not yet been received or the header doesn't exist in the response.
         * @param {string} type The type of header to return.
         * @returns {null|string} The response header.
         */
        getResponseHeader: function (type) {
            if (realXhr) {
                return realXhr.getResponseHeader(type);
            }
            if (type === 'Content-Type' && this.url.endsWith('xml')) {
                return 'application/xml';
            }
            return null;
        },
        /**
         * Sets the value of an HTTP request header. You must call setRequestHeader() after open(), but before send().
         * Useless in our case.
         * @param {string} header The name of the header whose value is to be set.
         * @param {string} value The value to set as the body of the header.
         */
        setRequestHeader: (header, value) => {
            if (realXhr) {
                realXhr.setRequestHeader(header, value);
            }
        },
        /**
         * Adds an event listener to the XMLHttpRequest object.
         * @param {string} type The type of event to listen for.
         * @param {Function} fn The function to call when the event is fired.
         */
        addEventListener: function (type, fn) {
            this.listeners[type] = fn;
        },
        readyState: 4,
        status: 200
    };
}

module.exports = createMockXHR;
