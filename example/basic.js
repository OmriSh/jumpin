var emitter = new Jumpin();
var serverEventPredicate = (data) => { return data.meta.toServer === true; };
var userEventPredicate = (data) => { return data.event.type === 'userEvent'; };
var allEvents = () => true;

//global event id
var id = 0;
emitter.on(allEvents, (data)=>{
    id++;
    data.event.id = id;
});

//add time for event that will be sent to server
emitter.on(serverEventPredicate, (data)=>{
    data.event.time = new Date();
});

//add browser data for user-event
emitter.on(userEventPredicate, (data)=>{
    new Promise(function(resolve){
        data.event.browser = navigator.userAgent;
        resolve(true);
    })
});

emitter.trigger({
    event: {
        type: 'userEvent'
    },
    meta: {
        toServer: true
    }
}).then((finalData)=>{
    console.log('finalData', finalData);
});