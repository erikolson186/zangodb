const { toPathPieces } = require('../util.js');

class Path {
    constructor(path) {
        this.pieces = toPathPieces(path);
        this.literal = path;
    }
}

module.exports = Path;
