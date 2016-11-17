'use strict';

if (!process.browser) {
    global.indexedDB = require('fake-indexeddb');
    global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
    global.zango = require('../src');
}

describe('lang', function () {
    describe('expressions', function () {
        require('./lang/expression.js');
    });

    describe('filtering', function () {
        require('./lang/filter.js');
    });
});

describe('Collection', function () {
    describe('.find', function () {
        return require('./find.js');
    });
    describe('.aggregate', function () {
        return require('./aggregate.js');
    });

    describe('Cursor', function () {
        describe('.project', function () {
            return require('./project.js');
        });
        describe('.sort', function () {
            return require('./sort.js');
        });
        describe('.limit', function () {
            return require('./limit.js');
        });
        describe('.skip', function () {
            return require('./skip.js');
        });
    });

    describe('.update', function () {
        return require('./update.js');
    });
    describe('.remove', function () {
        return require('./remove.js');
    });
});