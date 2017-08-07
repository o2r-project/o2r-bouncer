/*
 * (C) Copyright 2017 o2r project.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/* eslint-disable */

/*
 *  This file shows the minimal required code to implement the validation of
 *  the authentication details. It will read the session cookie from the user
 *  and use passport to reference it against existing sessions. If a session
 *  is found, the user details are appended to the req object in the express
 *  routes. 
 *
 *  req.isAuthenticated(); returns true/false if this request comes from a
 *    authenticated user.
 *  req.user includes the User document from the database belonging to the
 *    authenticated user.
 *
 */

// you will probably want to move this to the config/config.js
const sessionsecret = process.env.SESSION_SECRET || 'o2r';

const express       = require('express');
const mongoose      = require('mongoose');
const passport      = require('passport');
const app           = express();

/*
 *  not shown: mongodb connection setup. should be obvious, regular connection.
 */

// these modules handle the cookies and session management. sessions are stored
// in the MongoDB, so that they are synchronized for all services.
const session       = require('express-session');
const MongoDBStore  = require('connect-mongodb-session')(session);

// this configures connect-mongodb-session to use the right db & collection.
const mongoStore    = new MongoDBStore({
  uri: 'mongodb://localhost/database', // you will obviously need to change this
  collection: 'sessions'
});

app.use(session({
  secret: sessionsecret, // this secret needs to be the same across all services!
  resave: true, // updates the cookie after every request, so that it doesn't run
                // out when regularly used.
  maxAge: 1000*60*60*24*7, // save cookies for one week (in milliseconds)
  store: mongoStore
}));

// these functions handle loading the mapping between session and User document
passport.serializeUser((user, cb) => {
  cb(null, user.orcid);
});

passport.deserializeUser((id, cb) => {
  User.findOne({orcid: id}, (err, user) => {
    if (err) cb(err);
    cb(null, user);
  });
});

// tell express to use passport for authentication handling
app.use(passport.initialize());
app.use(passport.session());

app.use('/', (req, res, next) => {
  console.log(req.isAuthenticated()); // --> true when the user is authenticated
  console.log(req.user); // contains the User document with the users information
});
