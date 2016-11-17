if (!process.browser) {
    global.indexedDB = require('fake-indexeddb');
    global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
    global.zango = require('../src');
}

describe('lang', () => {
    describe('expressions', () => {
        require('./lang/expression.js');
    });

    describe('filtering', () => {
        require('./lang/filter.js');
    });
});

describe('Collection', () => {
    describe('.find', () => require('./find.js'));
    describe('.aggregate', () => require('./aggregate.js'));

    describe('Cursor', () => {
        describe('.project', () => require('./project.js'));
        describe('.sort', () => require('./sort.js'));
        describe('.limit', () => require('./limit.js'));
        describe('.skip', () => require('./skip.js'));
    });

    describe('.update', () => require('./update.js'));
    describe('.remove', () => require('./remove.js'));
});
