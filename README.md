![ZangoDB](https://cldup.com/kvTEbzc-Sz.png)

**ZangoDB** is a **MongoDB-like** interface for **HTML5 IndexedDB** that supports most of the familiar filtering, projection, sorting, updating and aggregation features of MongoDB, for usage in the **web browser**.

## Example

```javascript
let db = new zango.Db('mydb', { people: ['age'] });
let people = db.collection('people');

let docs = [
    { name: 'Frank', age: 20 },
    { name: 'Thomas', age: 33 },
    { name: 'Todd', age: 33 },
    { name: 'John', age: 28 },
    { name: 'Peter', age: 33 },
    { name: 'George', age: 28 }
];

people.insert(docs).then(() => {
    return people.find({
        name: { $ne: 'John' },
        age: { $gt: 20 }
    }).group({
        _id: { age: '$age' },
        count: { $sum: 1 }
    }).project({
        _id: 0,
        age: '$_id.age'
    }).sort({
        age: -1
    }).forEach(doc => console.log('doc:', doc));
}).catch(error => console.error(error));
```

Which outputs:

```
doc: { count: 3, age: 33 }
doc: { count: 1, age: 28 }
```

## Installation

**ZangoDB** is available as an npm package, and the web-browser build can be [downloaded here](https://unpkg.com/zangodb@latest/dist/zangodb.min.js) or embedded:

```html
<script src="https://unpkg.com/zangodb@latest/dist/zangodb.min.js"></script>
```

For certain web browsers, such as Internet Explorer, the Babel polyfill is required and must be loaded before **ZangoDB**:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.23.0/polyfill.min.js"></script>
```

**ZangoDB** then can be accessed using the global variable `zango`.

To install **ZangoDB** for usage with [node](https://nodejs.org/):

```
$ npm install zangodb
```

In both cases, an implementation of IndexedDB is required. For environments without a native implementation of IndexedDB, [Fake IndexedDB](https://github.com/dumbmatter/fakeIndexedDB) can be used:

```javascript
global.indexedDB = require('fake-indexeddb');
global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
```

## Document Language Operators

### Filter Operators

The following filter operators are supported: `$and`, `$or`, `$not`, `$nor`, `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$elemMatch` and `$exists`.

### Expression Operators

Expression operators can be used in combination with the group and projection operators.

The following expression operators are supported: `$literal`, `$add`, `$subtract`, `$multiply`, `$divide`, `$mod`, `$abs`, `$ceil`, `$floor`, `$ln`, `$log10`, `$pow`, `$sqrt`, `$trunc`, `$concat`, `$toLower`, `$toUpper`, `$concatArrays`, `$dayOfMonth`, `$year`, `$month`, `$hour`, `$minute`, `$second`, and `$millisecond`.

### Update Operators

The following update operators are supported: `$set`, `$unset`, `$rename`, `$inc`, `$mul`, `$min`, `$max`, `$push`, `$pop`, `$pullAll`, `$pull`, and `$addToSet`.

### Group Operators

The following group operators are supported: `$sum`, `$avg`, `$min`, `$max`, `$push`, and `$addToSet`.

## Aggregation Pipeline Stages

The following aggregation pipeline stages are supported: `$match`, `$project`, `$group`, `$unwind`, `$sort`, `$skip`, and `$limit`.

## License

MIT, please view the LICENSE file.
