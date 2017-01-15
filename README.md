# Stand Up Timer

A timer for stand ups

## How to use

```bash
$ git clone git@github.com:anthony-maudry/standup-timer.git
$ cd standup-timer
$ npm install
$ npm start
```

And point your browser to `http://localhost:8000`. Optionally, specify
a port by supplying the `PORT` env variable.

## Features

- Multiple users can join a stand-up
- Each user defines a user name and the name of the stand-up to join
- The application will randomly design a user to speak.
- Each user has two minutes to speak

## Known bugs

- The "Start new meeting" feature does not work
- The behavour is weird when a user reachs a meeting
- The meeting information are not displayed