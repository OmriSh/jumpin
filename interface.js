emitter.on((data/*[, meta]*/)=>{
    return data.tagName === 'A';
}, (data, meta)=>{
    //can modify data or meta, when exit this scope try to see if there is some listeners that didn't jump and now fits
    //return undefined, promise or true; --true/promise will signals Emitter to re-fire
}).after(function (data, meta) {
});

//internal

//set Promise
//set stringSelector (alternative to predicates)

function Emitter(){
    this.predicateMap = [];
}

Emitter.on = function on(predicate, func){
    var entry = {
        predicate: predicate,
        func: func
    };
    this.predicateMap.push(entry);
    return {
        after: function(func){ //todo: on proto!!!
            entry.afterFunc = func;
        }
    };
};

Emitter.trigger = function trigger(data, meta){
    var context = {
        data: data,
        meta, meta,
        predicates: this.predicateMap.slice(0), //clone, todo: make sure that is work
        afters: []
    };
    return triggerInner(context);
};

function triggerInner(context){
    var reRun = false;
    var predicates = context.predicates;
    context.predicates = [];
    
    for(var i=predicates.length -1; i >=0; i--){
        if(predicates[i] && predicates[i].predicate(context.data, context.meta) === true){
            var result = predicates[i].func(context.data, context.meta);
            if(result === true || typeof result === 'promise'){
                if(predicates[i].after !== undefined){
                    afterFuncs.push(predicates[i].after);
                }
                if(result === true){
                    reRun = true;
                } else {
                    context.predicates.push(result);
                }
                predicates[i] = undefined; //was handled, mask on cloned array
            }
        }
    }

    return Promise.all(predicates).then((results)=>{ //by this point, no promises!
        reRun = reRun || results.filter((value)=>{value === true;});
        if(reRun){
            return triggerInner(context);
        } else {
            context.afterFuncs.forEach(function(func) {
                func(context.data, context.meta);
            });
        }
    });
}