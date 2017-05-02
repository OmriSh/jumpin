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

var Jumpin = new Jumpin({
    promiseFactory: promiseFactory,
    predicateTranslator: predicateTranslator
});

Jumpin.on('state:wakeup', function(data){
    console.log('shower');
    data.state = 'shower';
    return true; //return true means that we changed something that could be important for other listeners 
});

Jumpin.on('state:shower', function(data){
    return promiseFactory(function(resolve){
        setTimeout(()=>{
            data.state = 'eat';
            resolve(true);
        }, 1000);
    });
});

Jumpin.on('state:eat', function(data){
    return promiseFactory(function(resolve){
        setTimeout(()=>{
            data.state = 'sleep';
            resolve(true);
        }, 1000);
    });
});

Jumpin.on('state:sleep', function(data){
    data.state = 'wakeup';
    return true; //this should be blocked! listeners could not be called twice within one cycle
});

Jumpin.on('state:sleep', function(data){
    data.didSleep = true;
});

Jumpin.once('state:eat', function(data){
    return new Promise((resolve, reject)=>{
        setTimeout(()=>{reject(new Error('this error should be thrown only once!'))}, 5000);
    })
});

Jumpin.trigger({state: 'wakeup'}).then(console.log).catch(console.error); //log error (after 1+1+5 sec)
Jumpin.trigger({state: 'wakeup'}).then(console.log).catch(console.error); //log {state: wakeup, didSleep: true} (after 1+1 sec)