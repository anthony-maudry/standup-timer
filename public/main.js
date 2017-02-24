/*
 Main function to run the application
 */
(function () {
    let socket = io(),      // init socket events
        timer = null;       // timer var

    const EventHandlers = {
        onFormSubmit: (e) => {
            let action = e.target.getAttribute('action'), formData = new FormData(e.target), data = {};
            e.stopPropagation();
            e.preventDefault();

            for (let entry of formData.entries()) {
                data[entry[0]] = entry[1];
            }

            console.log(action, data);

            socket.emit(action, data);
        },

        onClickAction: (e) => {
            let action = e.target.dataset.action;
            e.stopPropagation();
            e.preventDefault();

            socket.emit(action);
        }
    };


    let makeUsers = (meeting) => {
        let users = [];

        for (let user of meeting.users) {
            users.push({
                username: user,
                status: ((user) => {
                    if (meeting.done.indexOf(user) !== -1) return 'done';
                    if (meeting.talking === user) return 'talking';
                    return 'idle';
                })(user)
            });
        }

        return users;
    };

    let userTalking = (username, talkLength) => {
        let timerRing = document.querySelector('.timer .ring'),
            ringMax = 440, timeout = 100, offset = ringMax / (talkLength / timeout),
            spent = 0, nb = 0;

        clearInterval(timer);

        timer = setInterval(() => {
            spent += timeout;
            nb++;
            timerRing.style.strokeDashoffset = ringMax - (nb * offset);
            if (spent >= talkLength) {
                clearInterval(timer);
                userFinished(username);
            }
        }, timeout);
    };

    let userFinished = (username) => {
        socket.emit('user finished', username);
    };

    let userAddedStream = Rx.Observable.create(observer => {
        socket.on('user added', data => { observer.onNext(data) });
    });

    userAddedStream.subscribe(data => {
        pages.updateContent('username', data);
        socket.username = data;
        // Display the welcome message
        pages.displayPage('meeting-choice');
    });

    // when meeting joined
    let meetingJoinedStream = Rx.Observable.create(observer => {
        socket.on('meeting joined', data => {observer.onNext(data)});
    });

    meetingJoinedStream.subscribe(data => {
        pages.displayPage('meeting-idle');
    });

    // when meeting confirmed by all users display the meeting
    let meetingConfirmedStream = Rx.Observable.create(observer => {
        socket.on('meeting confirmed', data => {observer.onNext(data)});
    });

    meetingConfirmedStream.subscribe(data => {
        pages.displayPage('meeting-confirm');
    });

    // when meeting confirmed by all users display the meeting
    // DEPRECATED with "update meeting" event
    // let startMeetingStream = Rx.Observable.create(observer => {
    //     socket.on('start meeting', data => { observer.onNext(data) });
    // });
    //
    // startMeetingStream.subscribe(data => {
    //     pages.displayPage('meeting-running');
    // });

    // Updates the meeting display when it changes
    let updateMeetingStream = Rx.Observable.create(observer => {
        socket.on('update meeting', data => { observer.onNext(data)});
    });

    updateMeetingStream.subscribe(meeting => {
        let users = makeUsers(meeting);
        pages.updateContent('meeting', meeting);
        pages.updateContent('meeting.users', users);
    });

    // Display timer launcher when user's turn comes
    let userTurnStream = Rx.Observable.create(observable => {
        socket.on('user turn', data => {observable.onNext(data)});
    });

    userTurnStream.subscribe(data => {
        pages.displayPage('ready-talking');
        document.querySelector('.done-button').classList.remove('no-display');
    });

    // Display the user that's talking
    let userTalkingStream = Rx.Observable.create(observable => {
        socket.on('user talking', data => { observable.onNext(data) });
    });

    userTalkingStream.subscribe(data => {
        let username = data.user, time = data.time, me = data.me;
        pages.updateContent('user.talking', me ? 'You' : username);
        pages.displayPage('user-talking');
        document.querySelector('.done-button').classList.add('no-display');
        userTalking(username, time);
    });

    // Displays the meeting end
    let endMeetingStream = Rx.Observable.create(observable => {
        socket.on('end meeting', data => { observable.onNext(data) });
    });

    endMeetingStream.subscribe(data => {
        pages.displayPage('meeting-over');
    });

    // User events
    let forms = document.querySelectorAll('form');
    let actions = document.querySelectorAll('[data-action]');


    for(let form of forms) {
        let formSubmitStream = Rx.Observable.fromEvent(form, 'submit');
        formSubmitStream.subscribe(e => {
            EventHandlers.onFormSubmit(e);
        });
    }

    for (let action of actions) {
        let formSubmitStream = Rx.Observable.fromEvent(action, 'click');
        formSubmitStream.subscribe(e => {
            EventHandlers.onClickAction(e);
        });
    }

    // start UI
    pages.displayPage('greetings');
})();