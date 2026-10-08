// Copyright 2014 SAP SE.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http: //www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
// either express or implied. See the License for the specific
// language governing permissions and limitations under the License.

/**
 * @fileoverview Check for correct line endings
 * @author Developer C <developer@example.com>
 */

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = function (context) {
    'use strict';

    var config = {
        ending: '\\n'
    };

    if (context.options[0]) {
        config.ending = context.options[0];
    }

    return {
        'Program': function checkLineEndings(node) {
            // Get the whole source code, not for node only.
            var src = context.getSource(),
                re;

            switch (config.ending) {
                case '\\r\\n':
                    re = /[^\r]\n|\r(?!\n)/;
                    break;
                case '\\r':
                    re = /\n/;
                    break;
                default:
                    re = /\r/;
            }

            if (re.test(src)) {
                context.report(node, 0, 'Invalid line endings.');
            }
        }
    };
};
