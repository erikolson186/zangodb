'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var memoize = require('memoizee');

var _require = require('../util.js');

var _get = _require.get;

var MISSING = require('./missing_symbol.js');

var Fields = function () {
    function Fields(doc) {
        _classCallCheck(this, Fields);

        this._doc = doc;
        this.get = memoize(this.get);
    }

    _createClass(Fields, [{
        key: 'get',
        value: function get(path) {
            var value = MISSING;

            _get(this._doc, path.pieces, function (obj, field) {
                value = obj[field];
            });

            return value;
        }
    }, {
        key: 'ensure',
        value: function ensure(paths) {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = paths[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var path = _step.value;

                    if (this.get(path) === MISSING) {
                        return false;
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            return true;
        }
    }]);

    return Fields;
}();

module.exports = Fields;