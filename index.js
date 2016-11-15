/*
 * (C) Copyright 2016 Jan Koppe.
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

// override global http proxy
require('global-tunnel').initialize();

const config = require('./config/config');
const debug = require('debug')('bouncer');

const express = require('express');
const session = require('express-session');
const app = express();
const backoff = require('backoff');

const mongoose = require('mongoose');
const User = require('./lib/model/user');
const MongoStore = require('connect-mongodb-session')(session);

const dbURI = config.mongo.location + config.mongo.database;
mongoose.connect(dbURI);
mongoose.connection.on('error', (err) => {
  debug('Could not connect to MongoDB @ %s: %s', dbURI, err);
});
// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function () {
  mongoose.connection.close(function () {
    debug('Mongoose default connection disconnected through app termination signal (SIGINT)');
    process.exit(0);
  });
});

const passport = require('passport');
const OAuth2Strat = require('passport-oauth2').Strategy;

// load controllers
var controllers = {};
controllers.user = require('./controllers/user');

// make sure required settings without defaults are availabe
if (typeof config.oauth.default.clientID == 'undefined' |
  typeof config.oauth.default.clientSecret == 'undefined') {
  console.error("Cannot start bouncer because: %s %s",
    (typeof config.oauth.default.clientID == 'undefined') ? "clientID is missing;" : "",
    (typeof config.oauth.default.clientSecret == 'undefined') ? "clientSecret is missing;" : ""
  );
  process.exit(4);
}

// configure oauth2 strategy for orcid use
const oauth2 = new OAuth2Strat(
  config.oauth.default,
  (req, accessToken, refreshToken, params, profile, cb) => {
    User.findOne({ orcid: params.orcid }, (err, user) => {
      if (err) return cb(err);
      if (user) {
        profile.orcid = user.orcid;
        profile.name = user.name;
        return cb(null, profile);
      } else {
        let newUser = new User({ orcid: params.orcid, name: params.name });
        newUser.save(err => {
          if (err) {
            return cb(err);
          } else {
            profile.orcid = params.orcid;
            profile.name = params.name;
            return cb(null, profile);
          }
        });
      }
    });
  }
);

passport.use(oauth2);

// serialize & deserialize create information for the session that references a user in the database
passport.serializeUser((user, cb) => {
  cb(null, user.orcid);
});

passport.deserializeUser((id, cb) => {
  debug("Deserialize for %s", id);
  User.findOne({ orcid: id }, (err, user) => {
    if (err) cb(err);
    cb(null, user);
  });
});

function initApp(callback) {
  debug('Initialize application');

  try {
    const mongoStore = new MongoStore({
      uri: config.mongo.location + config.mongo.database,
      collection: 'sessions'
    }, err => {
      if (err) {
        debug('Error starting MongoStore: %s', err);
      }
    });

    mongoStore.on('error', err => {
      debug('Error with MongoStore: %s', err);
    });

    app.use(session({
      secret: config.sessionsecret,
      resave: true,
      saveUninitialized: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      store: mongoStore
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/status', function (req, res) {
      res.setHeader('Content-Type', 'application/json');
      if (!req.isAuthenticated() || req.user.level < config.user.level.view_status) {
        res.status(401).send('{"error":"not authenticated or not allowed"}');
        return;
      }

      var response = {
        service: "bouncer",
        version: config.version,
        levels: config.user.level,
        mongodb: config.mongo,
        oauth: {
          name: oauth2.name,
          callbackURL: oauth2._callbackURL
        }
      };
      res.send(response);
    });

    // set content type for all responses (bouncer never serves content)
    app.use('/api/', (req, res, next) => {
      res.setHeader('Content-Type', 'application/json');

      var orcid = '';
      if (req.user && req.user.orcid) {
        orcid = ' | orcid: ' + req.user.orcid;
      }
      debug('REQUEST %s %s authenticated user: %s | session: %s',
        req.method, req.path, req.isAuthenticated(), req.session.id, orcid);

      next();
    });

    app.use('/api/v1/auth/login', passport.authenticate('oauth2'), (req, res) => {
      debug('Receiving callback from authentication service. User %s logged in with session %s.', req.user.orcid, req.sessionID);
      User.findOne({ orcid: req.user.orcid }, (err, user) => {
        if (err) {
          debug('ERROR: Could not retrieve user who just logged in from database: %s', err);
        }
        user.lastseen = new Date();
        user.save((err) => {
          debug('ERROR: Could not update field "lastseen" for user who just logged in: %s', err);
        });
      });

      res.redirect(config.login.redirect);
    });

    app.use('/api/v1/auth/logout', (req, res) => {
      // simple req.logout seems not to suffice for some users: http://stackoverflow.com/questions/13758207/why-is-passportjs-in-node-not-removing-session-on-logout
      req.logout();
      req.session.destroy(function (err) {
        debug('User session %s is logged out, and session is destroyed, error: %s', req.sessionID, err);
        res.redirect(config.logout.redirect);
      });
    });

    app.get('/api/v1/auth/whoami', (req, res) => {
      if (req.isAuthenticated()) {
        let answer = {
          orcid: req.user.orcid,
          name: req.user.name
        };
        res.send(JSON.stringify(answer));
      } else {
        res.status(401).send(JSON.stringify({ 'error': 'not authenticated' }));
      }
    });

    app.get('/api/v1/user', controllers.user.view);
    app.get('/api/v1/user/:id', controllers.user.viewSingle);
    app.patch('/api/v1/user/:id', controllers.user.patchLevel);

    app.listen(config.net.port, () => {
      debug('bouncer v%s.%s.%s API version %s listening on port %s',
        config.version.major,
        config.version.minor,
        config.version.bug,
        config.version.api,
        config.net.port
      );
    });

  } catch (err) {
    callback(err);
  }

  callback(null);
}

// auto_reconnect is on by default and only for RE(!)connects, BUT not for the initial attempt: http://bites.goodeggs.com/posts/reconnecting-to-mongodb-when-mongoose-connect-fails-at-startup/
var dbBackoff = backoff.fibonacci({
  randomisationFactor: 0,
  initialDelay: config.mongo.inital_connection_initial_delay,
  maxDelay: config.mongo.inital_connection_max_delay
});

dbBackoff.failAfter(config.mongo.inital_connection_attempts);
dbBackoff.on('backoff', function (number, delay) {
  debug('Trying to connect to MongoDB in %sms', delay);
});
dbBackoff.on('ready', function (number, delay) {
  debug('Connect to MongoDB (#%s) ...', number);
  mongoose.connect(dbURI, (err) => {
    if (err) {
      debug('Error during connect: %s', err);
      mongoose.disconnect(() => {
        debug('Mongoose: Disconnected all connections.');
      });
      dbBackoff.backoff();
    } else {
      // delay app startup to when MongoDB is available
      debug('Initial connection open to %s: %s', dbURI, mongoose.connection.readyState);
      initApp((err) => {
        if (err) {
          debug('Error during init!\n%s', err);
          mongoose.disconnect(() => {
            debug('Mongoose: Disconnected all connections.');
          });
          dbBackoff.backoff();
        }
        debug('Started application.');
      });
    }
  });
});
dbBackoff.on('fail', function () {
  debug('Eventually giving up to connect to MongoDB');
  process.exit(1);
});

dbBackoff.backoff();
