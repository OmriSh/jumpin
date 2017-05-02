function Jumpin(options){
    options = options || {};
    if(options.promiseCtor === undefined){
        if(typeof Promise === 'undefined'){
            throw new Error('\'options.promiseCtor\' is required if no default Promise is defined');
        }
        options.promiseCtor = Promise;
    }

    this.predicateMap = [];
    this.promiseCtor = options.promiseCtor;
    if(options.predicateTranslator !== undefined){
        this.predicateTranslator = options.predicateTranslator;
    }
}

Jumpin.prototype.on = function on(predicate, func){
    this._register(predicate, func);
};

Jumpin.prototype.once = function on(predicate, func){
    var entry = this._register(predicate, func);
    entry.isOnce = true;
};

Jumpin.prototype.trigger = function trigger(data){
    var self = this;
    var predicates = self.predicateMap.slice(0); //clone current array
    return self._recursiveTrigger(predicates, data).then(function(){
         return new self.promiseCtor(function(resolve){
            resolve(data);
        });
    });
};

Jumpin.prototype._register = function _register(predicate, func) {
    if(this.predicateTranslator !== undefined){
        predicate = this.predicateTranslator(predicate);
    }
    var entry = {
        predicate: predicate,
        func: func,
        isEnabled: true
    };
    this.predicateMap.push(entry);
    return entry;
}

Jumpin.prototype._invokeEntryFunc = function _invokeEntryFunc(entry, data){
    if(entry.isEnabled === true){
        var func = entry.func;
        if(entry.isOnce === true){
            entry.isEnabled = false;
            entry.predicate = null; //clean closure
            entry.func = null; //clean closure
            var entryIndex = this.predicateMap.indexOf(entry);
            if(entryIndex !== -1){
                this.predicateMap.splice(entryIndex, 1); //remove from main array
            }
        }
        return func(data);
    }
};

Jumpin.prototype._recursiveTrigger =  function _recursiveTrigger(predicates, data){
    var reRun = false, promises = [], predicateFailed = false;

    for(var i=predicates.length -1; i >=0; i--){

        var predicateResult = false; //should not run
        if(predicates[i] !== undefined && predicates[i].isEnabled === true){
            predicateResult = predicates[i].predicate(data);
            if(predicateResult === false){
                predicateFailed = true; //tell if there are any leftovers for rerun  
            } else if(predicateResult === true){
                var result = this._invokeEntryFunc(predicates[i], data);
                if(result !== undefined){
                    if(result === true){ //someting had changed with that object, need to check if there are leftover handlers
                        reRun = true;
                    } else if(result.then !== undefined){ //check if promise-like
                        promises.push(result);
                    } else if(result !== false){
                        throw new Error('return value should be either a promise, boolean or undefined');
                    }
                    predicates[i] = undefined; //was handled, mask on cloned array
                }
            } else {
                throw new Error('predicate return value should be boolean, got ' + typeof predicateResult);
            }
        }
    }

    return this._PromiseWhenAll(promises).then((results)=>{ //by this point, no promises!
        var resultsLength = results.length;
  
        while(reRun === false && resultsLength !== 0){
            resultsLength--;
            reRun = results[resultsLength] === true;
        }

        reRun = reRun && predicateFailed === true; //re-run could not run, should warn?

        if(reRun === true){
            return this._recursiveTrigger(predicates, data);
        }
    });
}

Jumpin.prototype._PromiseWhenAll = function _PromiseWhenAll(promises) { //this function in not part of the Promises/A+ spec
    return new this.promiseCtor(function(resolve, reject) {
        var context = {
            counter: promises.length,
            results: []
        };
        if(context.counter === 0){ return resolve(context.results); }
        
        function createThenHandler(index){ return function(result){ return thenHandler.call(context, result, index); }}

        function thenHandler(result, index){ 
            this.results[index] = result;
            if(--this.counter === 0){ return resolve(this.results); }
        };

        for(var i=promises.length -1; i >=0; i--){
            promises[i].then(createThenHandler(i)).catch(reject);
        }
    });
}

//expose as a node module (also for browserify)
if(typeof module !== 'undefined'){
    module.exports = Jumpin;
}