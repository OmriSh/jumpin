var Jumpin = new Jumpin({promiseFactory: function(promiseFunc){return new Promise(promiseFunc)}});
var serverEventPredicate = (data) => { return data.meta.toServer === true; };
var userEventPredicate = (data) => { return data.event.type === 'userEvent'; };
var allEvents = () => true;

//global event id
var id = 0;
Jumpin.on(allEvents, (data)=>{
    id++;
    data.eventId = id;
    setTimeout(resolve, 1000);
});

//add time for event that will be sent to server
Jumpin.on(serverEventPredicate, (data)=>{
    data.event.time = new Date();
});

//add browser data for user-event
Jumpin.on(userEventPredicate, (data)=>{
    new Promise(function(resolve){
        data.event.browser = navigator.userAgent;
        resolve(true);
    })
});

Jumpin.trigger({
    event: {
        type: 'userEvent'
    },
    meta: {
        toServer: true
    }
}).then((finalData)=>{
    console.log('finalData', finalData);
});