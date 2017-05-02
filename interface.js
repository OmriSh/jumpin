emitter.on((data/*[, meta]*/)=>{
    return data.tagName === 'A';
}, (data, meta)=>{
    //can modify data or meta, when exit this scope try to see if there is some listeners that didn't jump and now fits
    //return undefined, promise or true; --true/promise will signals Emitter to re-fire
});

emitter.trigger({type: 'scroll'})
.then(function(data, meta){

});

emitter.on('selector', (data)=>{
    return emitter.trigger('sometingElse'); //will make 'selector' trigger to wait for 'sometingElse' listeners
});

//internal

//set Promise
//set stringSelector (alternative to predicates)

function Emitter(promiseFactory){
    this.predicateMap = [];
    this.promiseFactory = promiseFactory;
}

Emitter.prototype.on = function on(predicate, func){
    var entry = {
        predicate: predicate,
        func: func
    };
    this.predicateMap.push(entry);
};

Emitter.prototype.trigger = function trigger(data, meta){
    var promiseFactory = this.promiseFactory;
    var context = {
        data: data || {},
        meta: meta || {},
        predicates: this.predicateMap.slice(0) //clone, todo: make sure that is work
    };
    return triggerInner(context, promiseFactory).then(function(){
         return promiseFactory(function(resolve){
             debugger;
            resolve(context.data, context.meta);
        });
    });
};

function triggerInner(context, promiseFactory){
    var reRun = false, promises = [];
    
    for(var i=context.predicates.length -1; i >=0; i--){
        if(context.predicates[i] && context.predicates[i].predicate(context.data, context.meta) === true){
            var result = context.predicates[i].func(context.data, context.meta);
            if(result !== undefined){
                if(typeof result === 'boolean'){
                    reRun = reRun || result;
                } else if(typeof result.then === 'function'){ //check if promise-like
                    promises.push(result);
                } else{
                    throw new Error('return value should be either a promise, boolean or undefined');
                }
                context.predicates[i] = undefined; //was handled, mask on cloned array
            }
        }
    }

    return PromiseWhenAll(promises, promiseFactory).then((results)=>{ //by this point, no promises!
        if(results !== undefined && results.length !== 0){
            reRun = reRun || results.filter((value)=>{ value === true; });
        }
        if(reRun){
            return triggerInner(context, promiseFactory);
        }
    });
}

function PromiseWhenAll(promises, promiseFactory) { //this function in not part of the Promises/A+ spec, unsorted
    var resolve, reject, counter = promises.length, results = [];
    var promise = promiseFactory(function(resolveArg, rejectArg) {
        resolve = resolveArg;
        reject = rejectArg;
    });

    function createThenHandler(index){
        return (result)=> thenHandler(result, index);
    }
    
    function thenHandler(result, index){ 
        results[index] = result;
        if(--counter === 0){ resolve(results); }
    };

    function catchHendler() { reject(); }

    for(var i=promises.length -1; i >=0; i--){
        promises[i].then(createThenHandler(i)).catch(catchHendler);
    }

    if(promises.length === 0){
        resolve();
    }

    return promise;
}


var emitter = new Emitter(function(a,b,c){return new Promise(a,b,c)});
var serverEventPredicate = (d, meta)=>{ return meta.toServer === true; };
var userEventPredicate = (data)=>{ return data.type === 'userEvent'; };

//event meta-data
emitter.on(serverEventPredicate, (data)=>{
    data.time = new Date();
    data.timezone = (data.time).toString().match(/\s([^\s]*)\s\((.*)\)$/)[2];
});

//browser data
emitter.on(userEventPredicate, (data)=>{
    data.browser = navigator.userAgent;
});

emitter.trigger({type: 'userEvent', time: Date.now()}, { toServer: true }).then(function(data, meta){
    console.log('data', data);
    console.log('meta', meta);
});