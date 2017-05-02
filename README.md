# Jumpin
An emitter-like way to distributedly create and modify objects.

## Installation
Using npm:

    $ npm install jumpin --save

## Usage
```JavaScript
    const Jumpin = require('jumpin');
    const promiseFactory = function promiseFactory(promiseFunc){
        return new Promise(promiseFunc);
    };
    const allPredicate = ()=>true;
    const timePredicate = (data)=>{ return typeof data.time === 'number'; };

    var emitter = new Jumpin({ promiseFactory: promiseFactory } );

    emitter.on(allPredicate, (obj)=>{
        obj.time = Date.now();
        return true;
    });

    emitter.on(timePredicate, (obj)=>{
        obj.time = new Date(obj.time).toISOString();
    });

    emitter.trigger({type: 'first-event'}).then(function(data){
        console.log(data.type); //logs 'first-event'
        console.log(data.time); //logs formatted date
    });
```

## Change Log

### Jumpin v0.0.1
    * First release (beta)