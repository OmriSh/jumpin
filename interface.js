function Emitter(options){
    if(options === undefined){
        throw new Error('options argument is not optional');
    }
    if(options.promiseFactory === undefined){
        throw new Error('missing \'promiseFactory\' on options argument');
    }
    this.predicateMap = [];
    this.promiseFactory = options.promiseFactory;
    if(options.predicateTranslator){
        this.predicateTranslator = options.predicateTranslator;
    }
}

Emitter.prototype.on = function on(predicate, func){
    if(this.predicateTranslator !== undefined){
        predicate = this.predicateTranslator(predicate);
    }
    var entry = {
        predicate: predicate,
        func: func
    };
    this.predicateMap.push(entry);
};

Emitter.prototype.trigger = function trigger(data){
    var promiseFactory = this.promiseFactory;
    var context = {
        data: data,
        predicates: this.predicateMap.slice(0) //clone current listeners
    };
    return recursiveTrigger(context, promiseFactory).then(function(){
         return promiseFactory(function(resolve){
            resolve(context.data);
        });
    });
};

function recursiveTrigger(context, promiseFactory){
    var reRun = false, promises = [], predicateFailed = false;

    for(var i=context.predicates.length -1; i >=0; i--){
        var predicateResult = (!!context.predicates[i]) && context.predicates[i].predicate(context.data);
        if(predicateResult === true){
            var result = context.predicates[i].func(context.data);
            if(result !== undefined){
                if(result === true){ //someting had changed with that object, need to check if there are leftover handlers
                    reRun = true;
                } else if(result.then !== undefined){ //check if promise-like
                    promises.push(result);
                } else if(result !== false){
                    throw new Error('return value should be either a promise, boolean or undefined');
                }
                context.predicates[i] = undefined; //was handled, mask on cloned array
            }
        } else if(predicateResult === false){
            predicateFailed = true;
        } else {
            throw new Error('predicate return value should be boolean, got type ' + typeof predicateResult);
        }
    }

    return PromiseWhenAll(promises, promiseFactory).then((results)=>{ //by this point, no promises!
        if(results.length !== 0){
            reRun = reRun || results.filter((value)=>{ value === true; });
        }

        reRun = reRun && predicateFailed === true; //re-run could not run, should warn?

        if(reRun){
            return recursiveTrigger(context, promiseFactory);
        }
    });
}

function PromiseWhenAll(promises, promiseFactory) { //this function in not part of the Promises/A+ spec
    return promiseFactory(function(resolve, reject) {
        if(promises.length === 0){ return resolve(promises); }
        var counter = promises.length, results = [];
        function createThenHandler(index){ return (result)=> thenHandler(result, index); }
        
        function thenHandler(result, index){ 
            results[index] = result;
            if(--counter === 0){ resolve(results); }
        };

        for(var i=promises.length -1; i >=0; i--){
            promises[i].then(createThenHandler(i)).catch(reject);
        }
    });
}

/*var emitter = new Emitter(function(promiseFunc){return new Promise(promiseFunc)});
var serverEventPredicate = (data)=>{ return data.meta.toServer === true; };
var userEventPredicate = (data)=>{ return data.event.type === 'userEvent'; };
var all = ()=>true;
var eventsWithId = (data)=>{ return data.eventId !== undefined};

//event meta-data
emitter.on(serverEventPredicate, (data)=>{
    data.event.time = new Date();
    data.event.timezone = (data.event.time).toString().match(/\s([^\s]*)\s\((.*)\)$/)[2];
});

//browser data
emitter.on(userEventPredicate, (data)=>{
    data.event.browser = navigator.userAgent;
});

//global event id
emitter.on(all, (data)=>{
    return new Promise((resolve)=>{
        data.eventId = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function(c) { return (Math.random()*16|0).toString(16); });
        setTimeout(resolve, 1000);
    }).then(()=>{
        data.eventId = data.eventId.toUpperCase();
        return true;
    });
});

//reformatEventID
emitter.on(eventsWithId, (data)=>{
    data.eventId += '_WTF?!';
});

emitter.on(serverEventPredicate, (data)=>{
    data.event.browser = navigator.userAgent;
});

emitter.trigger({event: { type: 'userEvent', time: Date.now() }, meta: { toServer: true }}).then(function(data){
    console.log('data', data);
});*/

var predicateTranslator = function(predicate){
    var leftSide, rightSide;
    var sides = predicate.replace(/\s/g, '').split(':');
    if(sides.length > 2)
        throw new Error('unvalid predicate');
    leftSide = sides[0].split('.');
    rightSide = sides[1] || { all: true };
    return predicateCreator(leftSide, rightSide);
}

function predicateCreator(path, value){
    return function predicateEvaluator(data) {
        try{
            var length = path.length;
            for(var i=0; i<length; i++){
                data = data[path[i]];
            }

            if(value.all===true){
                return data !== undefined;
            } else {
                return data == value;
            }
        } catch(ex){
            return false;
        }
    }
}

function promiseFactory(promiseFunc){
    return new Promise(promiseFunc);
}

var emitter = new Emitter({
    promiseFactory: promiseFactory,
    predicateTranslator: predicateTranslator
});

emitter.on('state:wakeup', function(data){
    console.log('shower');
    data.state = 'shower';
    return true;
});

emitter.on('state:shower', function(data){
    return promiseFactory(function(resolve){
        console.log('eat timeout create');
        setTimeout(()=>{
            data.state = 'eat';
            console.log('eat timeout done');
            resolve(true);
        }, 1000);
    });
});

emitter.on('state:eat', function(data){
    return promiseFactory(function(resolve){
        console.log('sleep timeout create');
        setTimeout(()=>{
            data.state = 'sleep';
            console.log('sleep timeout done');
            resolve(true);
        }, 1000);
    });
});

emitter.on('state:sleep', function(data){
    data.state = 'wakeup';
    return true; //this should be blocked! listeners could not be called twice within one cycle
});

console.log('wakeup');
emitter.trigger({state: 'wakeup'}).then(console.log);