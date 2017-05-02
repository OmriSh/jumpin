# Jumpin
An emitter-like way to distributively create and modify objects.

## Install
```sh
$ npm install jumpin --save
```

## Usage
```js
    const Jumpin = require('jumpin');
    const emitter = new Jumpin();
    const allPredicate = () => true;
    const timePredicate = (data) => {
        return typeof data.time === 'number';
    };

    emitter.on(allPredicate, (obj) => {
        obj.time = Date.now();
        //returning true means that failed predicates will be reexamine
        //note: listeners that were invoked in this cycle won't get invoke again
        //returning false or undefined means that failed predicates might not get reexamined
        return true;
    });

    //async operation - will delay main pipeline
    emitter.on(timePredicate, (obj) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                obj.time = new Date(obj.time).toISOString();
                return resolve(false);
            }, 250);
        });
    });

    emitter.trigger({
            type: 'first-event'
        })
        .then((data) => {
            console.log(data.type); //log 'first-event'
            console.log(data.time); //log formatted date
        });
```

## API
Full API documentation is yet to be written, but you can view the [source](https://github.com/OmriSh/jumpin/blob/master/src/index.js) and [examples](https://github.com/OmriSh/jumpin/tree/master/example).

## Change Log

### Jumpin v0.0.5
* update documentation

### Jumpin v0.0.4
* update documentation
* minor changes

### Jumpin v0.0.3
* fix bug in rerun mechanism

### Jumpin v0.0.2
* use PromiseCtor instead of promiseFactory

### Jumpin v0.0.1
* first release (beta)