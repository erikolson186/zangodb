'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events'),
    memoize = require('memoizee'),
    Q = require('q');

var _require = require('./util.js');

var getIDBError = _require.getIDBError;

var Collection = require('./collection.js');

/**
 * Db blocked event.
 * @event Db#blocked
 *
 * @example
 * db.on('blocked', () => {
 *     console.log('database version cannot be upgraded');
 * });
 */

/**
 * Class representing a database.
 * @param {string} name The name of the database.
 * @param {number} [version] The version of the database.
 * @param {object|string[]} config The collections configuration.
 *
 * @example
 * let db = new zango.Db('mydb', {
 *     // Define collection.
 *     col1: {
 *         // Create index if it doesn't already exist.
 *         index1: true,
 *
 *         // Delete index from pre-existing database.
 *         index2: false
 *     },
 *
 *      // Define collection with indexes.
 *     col2: ['index1', 'index2'],
 *
 *     // Define collection without indexes.
 *     col3: true,
 *
 *     // Delete collection from pre-existing database.
 *     col4: false
 * });
 *
 * @example
 * // Define collections without indexes.
 * let db = new zango.Db('mydb', ['col1', 'col2']);
 */

var Db = function (_EventEmitter) {
    _inherits(Db, _EventEmitter);

    function Db(name, version, config) {
        _classCallCheck(this, Db);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Db).call(this));

        _this._name = name;

        if ((typeof version === 'undefined' ? 'undefined' : _typeof(version)) === 'object') {
            config = version;
        } else {
            _this._version = version;
        }

        _this._cols = {};
        _this._config = {};
        _this._initGetConn();

        if (Array.isArray(config)) {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = config[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var _name = _step.value;

                    _this._addCollection(_name);
                    _this._config[_name] = true;
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
        } else {
            for (var _name2 in config) {
                _this._addCollection(_name2);
                _this._addIndex(config[_name2], _name2);
            }
        }
        return _this;
    }

    /**
     * The name of the database.
     * @type {string}
     */


    _createClass(Db, [{
        key: '_addCollection',
        value: function _addCollection(name) {
            this._cols[name] = new Collection(this, name);
        }
    }, {
        key: '_addIndex',
        value: function _addIndex(index_config, path) {
            var config = this._config;

            if (!index_config) {
                return config[path] = false;
            }

            if ((typeof index_config === 'undefined' ? 'undefined' : _typeof(index_config)) !== 'object') {
                return config[path] = {};
            }

            var col = this._cols[path];

            if (Array.isArray(index_config)) {
                var new_value = {};

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = index_config[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var index_path = _step2.value;

                        new_value[index_path] = true;

                        col._indexes.add(index_path);
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                config[path] = new_value;
            } else {
                for (var _index_path in index_config) {
                    if (index_config[_index_path]) {
                        col._indexes.add(_index_path);
                    }
                }

                config[path] = index_config;
            }
        }
    }, {
        key: '_addStore',
        value: function _addStore(idb, name) {
            var store = idb.createObjectStore(name, {
                keyPath: '_id',
                autoIncrement: true
            });

            var index_config = this._config[name];

            for (var path in index_config) {
                if (index_config[path]) {
                    store.createIndex(path, path, { unique: false });
                } else {
                    store.deleteIndex(path);
                }
            }
        }
    }, {
        key: '_getConn',
        value: function _getConn(cb) {
            var _this2 = this;

            var req = void 0;

            if (this._version) {
                req = indexedDB.open(this._name, this._version);
            } else {
                req = indexedDB.open(this._name);
            }

            req.onsuccess = function (e) {
                var idb = e.target.result;

                _this2._idb = idb;
                _this2._version = idb.version;
                _this2._open = true;

                cb(null, idb);
            };

            req.onerror = function (e) {
                return cb(getIDBError(e));
            };

            req.onupgradeneeded = function (e) {
                var idb = e.target.result;

                for (var name in _this2._config) {
                    try {
                        if (!_this2._config[name]) {
                            idb.deleteObjectStore(name);
                        } else if (!idb.objectStoreNames.contains(name)) {
                            _this2._addStore(idb, name);
                        }
                    } catch (error) {
                        return cb(error);
                    }
                }
            };

            req.onblocked = function () {
                return _this2.emit('blocked');
            };
        }
    }, {
        key: '_initGetConn',
        value: function _initGetConn() {
            this._getConn = memoize(this._getConn, { async: true });
        }

        /**
         * Retrieve a {@link Collection} instance.
         * @param {string} name The name of the collection.
         * @return {Collection}
         *
         * @example
         * let col = db.collection('mycol');
         */

    }, {
        key: 'collection',
        value: function collection(name) {
            var col = this._cols[name];

            if (!col) {
                throw Error('collection \'' + name + '\' does not exist');
            }

            return col;
        }

        /**
         * Open connection to the database.
         * @param {function} [cb] The result callback.
         * @return {Promise}
         */

    }, {
        key: 'open',
        value: function open(cb) {
            var _this3 = this;

            var deferred = Q.defer();

            this._getConn(function (error) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(_this3);
                }
            });

            deferred.promise.nodeify(cb);

            return deferred.promise;
        }

        /**
         * Close the connection if it is open.
         */

    }, {
        key: 'close',
        value: function close() {
            if (this._open) {
                this._idb.close();
                this._open = false;
                this._initGetConn();
            }
        }

        /**
         * Delete the database, closing the connection if it is open.
         * @param {function} [cb] The result callback.
         * @return {Promise}
         *
         * @example
         * db.drop((error) => {
         *     if (error) { throw error; }
         * });
         */

    }, {
        key: 'drop',
        value: function drop(cb) {
            this.close();

            var deferred = Q.defer();
            var req = indexedDB.deleteDatabase(this._name);

            req.onsuccess = function () {
                return deferred.resolve();
            };
            req.onerror = function (e) {
                return deferred.reject(getIDBError(e));
            };

            deferred.promise.nodeify(cb);

            return deferred.promise;
        }
    }, {
        key: 'name',
        get: function get() {
            return this._name;
        }

        /**
         * The version of the database.
         * @type {number}
         */

    }, {
        key: 'version',
        get: function get() {
            return this._version;
        }
    }]);

    return Db;
}(EventEmitter);

module.exports = Db;