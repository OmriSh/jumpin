# Jumpin
An emitter-like way to distributively create and modify objects.

## Installation
Using npm:

    $ npm install jumpin --save

## Usage
```JavaScript
    const Jumpin = require('jumpin');
    const allPredicate = ()=>true;
    const timePredicate = (data)=>{ return typeof data.time === 'number'; };

    var emitter = new Jumpin();

    emitter.on(allPredicate, (obj)=>{
        obj.time = Date.now();
        //returning true means that we changed something that other listener's predicates might care about
        //note: listeners that were invoked in this cycle won't get invoke again
        return true;
    });

    //async operation, will cause main pipeline to be delayed
    emitter.on(timePredicate, (obj)=>{
        return new Promise((resolve)=>{
            setTimeout(()=>{
                obj.time = new Date(obj.time).toISOString();
                return resolve(false); //returning false (and undefined) means that we don't wan't to try failed listener's-predicates again
            }, 250);
        });
    });

    emitter.trigger({type: 'first-event'}).then(function(data){
        console.log(data.type); //logs 'first-event'
        console.log(data.time); //logs formatted date
    });
```

## API
Full API documentation is yet to be written, but you can view the [source](https://github.com/OmriSh/jumpin/blob/master/src/index.js) and [examples](https://github.com/OmriSh/jumpin/tree/master/example).

## Change Log

### Jumpin v0.0.3
* fix bug in rerun mechanism

### Jumpin v0.0.2
* use PromiseCtor instead of promiseFactory

### Jumpin v0.0.1
* first release (beta)