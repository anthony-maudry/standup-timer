// Setup basic express server
let express = require('express');
let app = express();
let server = require('http').createServer(app);
let io = require('socket.io')(server);
let port = process.env.PORT || 8000;

const STANDUP_TIME = 2000 * 60;

server.listen(port, () => {
    console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Meetings
let meetings = {};

let pickUser = (meetingName) => {
    let meeting = meetings[meetingName],
        pickableUsers = meeting.users.filter((user) => {
            return meeting.done.indexOf(user) === -1;
        });

    return pickableUsers[Math.floor(Math.random() * pickableUsers.length)];
};

let nextTurn = (meetingName) => {
    let user = pickUser(meetingName);

    if (user) {
        io.to(meetingName).emit('user turn', user);
    } else {
        endMeeting(meetingName);
    }
};

let endMeeting = (meetingName) => {
    io.to(meetingName).emit('end meeting', meetingName);
    delete meetings[meetingName];
};

io.on('connection', (socket) => {
    let addedUser = false;

    let leaveMeeting = () => {
        if (!socket.meeting) return;

        if (meetings[socket.meeting] && meetings[socket.meeting].users.indexOf(socket.username)) {
            meetings[socket.meeting].users.slice(meetings[socket.meeting].users.indexOf(socket.username), 1);
        }

        let meeting = meetings[socket.meeting];

        socket.meeting = null;

        socket.emit('left meeting', meeting);
        io.to(meeting).emit('user left', socket.username);

        io.to(meeting).emit('update meeting', meetings[meeting]);
    };

    let joinMeeting = (data) => {
        let meetingName = data.meeting;
        if (socket.meeting === meetingName) return;
        if (!socket.username) return;

        leaveMeeting();

        if (!meetings[meetingName]) {
            meetings[meetingName] = {
                name: meetingName,
                users: [socket.username],
                confirmed: [],
                done: [],
                talking: null,
                advance: 0
            };
        } else {
            if (meetings[meetingName].users.indexOf(socket.username) === -1) {
                meetings[meetingName].users.push(socket.username);
            }
        }

        socket.meeting = meetingName;

        socket.join(meetingName);

        socket.emit('meeting joined', meetings[meetingName]);

        io.to(meetingName).emit('user joined', socket.username);

        io.to(meetingName).emit('update meeting', meetings[meetingName]);
    };

    let addUser = (data) => {
        let username = data.username;
        if (addedUser) return;
        if (!username) {
            console.error('No username');
            return;
        }

        // we store the username in the socket session for this client
        socket.username = username;
        addedUser = true;
        socket.emit('user added', socket.username);
    };

    let confirmMeeting = () => {
        let meeting = socket.meeting;
        if (meetings[meeting].confirmed.indexOf(socket.username) === -1) {
            meetings[meeting].confirmed.push(socket.username);
        }

        socket.emit('meeting confirmed', meetings[meeting]);

        if (meetings[meeting].confirmed.length === meetings[meeting].users.length) {
            startMeeting();
        }
    };

    let startMeeting = () => {
        io.to(socket.meeting).emit('start meeting');

        nextTurn(socket.meeting);
    };

    let userStart = () => {
        let meeting = meetings[socket.meeting];

        io.to(meeting.name).emit('user talking', {user: socket.username, time: STANDUP_TIME});

        meeting.talking = socket.username;

        io.to(meeting.name).emit('update meeting', meeting);
    };

    let userFinished = () => {
        let meeting = meetings[socket.meeting];
        meeting.done.push(socket.username);

        io.to(meeting.name).emit('user done', socket.username);

        nextTurn(meeting.name);
    };

    socket.on('add user', addUser);

    socket.on('join meeting', joinMeeting);

    socket.on('start meeting', confirmMeeting);

    socket.on('leave meeting', leaveMeeting);

    socket.on('user start', userStart);

    socket.on('user finished', userFinished);

    socket.on('new meeting', () => {
        socket.emit('user added', socket.username);
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        leaveMeeting();
    });
});