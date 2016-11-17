'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../util.js');

var toPathPieces = _require.toPathPieces;

var Path = function Path(path) {
    _classCallCheck(this, Path);

    this.pieces = toPathPieces(path);
    this.literal = path;
};

module.exports = Path;