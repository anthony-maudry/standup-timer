(function () {
    // Socket events
    let socket = io(),
        connected = false,
        timer = null;


    if (!String.prototype.format) {
        String.prototype.format = function (data) {
            return this.replace(/{(\w+)}/g, function (match, key) {
                return typeof data[key] != 'undefined'
                    ? data[key]
                    : match
                    ;
            });
        };
    }

    let displayPage = (page) => {
        for (element of document.querySelectorAll(`.page:not(.${page})`)) {
            if (!element.classList.contains('no-display')) {
                element.classList.add('no-display');
            }
        }

        document.querySelector(`.page.${page}`).classList.remove('no-display');
        if (document.querySelector(`.page.${page} .focus-in`)) {
            document.querySelector(`.page.${page} .focus-in`).focus();
        }
    };

    let updateContent = (placeholder, data) => {
        console.info('update');
        console.info(placeholder);
        console.info(data);
        let elements = document.querySelectorAll(`[data-content="${placeholder}"]`);

        for (let element of elements) {
            let templateName = element.dataset.template,
                template = templateName && templates[templateName] ? templates[templateName] : '{0}',
                loop = element.dataset.loop;
            if (typeof loop !== 'undefined') {
                console.log('loop');
                element.innerHTML = '';
                for (let item of data) {
                    if (!(item instanceof Array) && !(item instanceof Object)) {
                        item = [item];
                    }
                    element.innerHTML += template.format(item);
                }
            } else {
                console.log('no loop');
                if (!(data instanceof Array) && !(data instanceof Object)) {
                    console.log('string');
                    data = [data];
                }
                element.innerHTML = template.format(data);
            }
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
        if (username === socket.username) {
            socket.emit('user finished', username);
        }
    };

    socket.on('user added', (username) => {
        connected = true;
        updateContent('username', username);
        socket.username = username;
        // Display the welcome message
        displayPage('meeting-choice');
    });

    // when meeting joined
    socket.on('meeting joined', (meeting) => {
        socket.meeting = meeting;
        displayPage('meeting-idle');
    });

    // when meeting confirmed by all users display the meeting
    socket.on('meeting confirmed', (meeting) => {
        displayPage('meeting-confirm');
    });

    // when meeting confirmed by all users display the meeting
    socket.on('start meeting', (meeting) => {
        // displayPage('meeting-running');
    });

    socket.on('update meeting', (meeting) => {
        let users = makeUsers(meeting);
        socket.meeting = meeting;
        updateContent('meeting', meeting);
        updateContent('meeting.users', users);
    });

    socket.on('user turn', (username) => {
        if (username === socket.username) {
            displayPage('ready-talking');
        }
    });

    socket.on('user talking', (data) => {
        let username = data.user, time = data.time;
        updateContent('user.talking', username === socket.username ? 'You' : username);
        displayPage('user-talking');
        userTalking(username, time);
    });

    socket.on('end meeting', (meetingName) => {
        displayPage('meeting-over');
    });

    // User events
    let forms = document.querySelectorAll('form');
    let actions = document.querySelectorAll('[data-action]');

    let onFormSubmit = (e) => {
        let action = e.target.getAttribute('action'), formData = new FormData(e.target), data = {};
        e.stopPropagation();
        e.preventDefault();

        for (let entry of formData.entries()) {
            data[entry[0]] = entry[1];
        }

        socket.emit(action, data);
    };

    let onClickAction = (e) => {
        let action = e.target.dataset.action;
        console.info('click action', action);

        e.stopPropagation();
        e.preventDefault();

        socket.emit(action);
    };

    for (let form of forms) {
        form.addEventListener('submit', onFormSubmit);
    }

    for (let action of actions) {
        action.addEventListener('click', onClickAction)
    }

    // start UI
    displayPage('greetings');
})();