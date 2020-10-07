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

const config = require('./config/config');
const debug = require('debug')('bouncer');
const colors = require('colors');

// override global http proxy
const globalTunnel = require('global-tunnel-ng');
globalTunnel.initialize();
debug('Using global-tunnel-ng config %s.\nIs proxying? %s. env vars: http_proxy=%s https_proxy=%s',
  JSON.stringify(globalTunnel.proxyConfig), globalTunnel.isProxying,
  process.env.http_proxy, process.env.https_proxy
);

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const compression = require('compression');
const app = express();
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const backoff = require('backoff');
const request = require('request');
const mongoose = require('mongoose');
const User = require('./lib/model/user');
const MongoStore = require('connect-mongodb-session')(session);

const slackbot = require('./lib/slack');

// use ES6 promises for mongoose
mongoose.Promise = global.Promise;

const dbURI = config.mongo.location + config.mongo.database;
var dbOptions = {
  keepAlive: 30000,
  socketTimeoutMS: 30000,
  promiseLibrary: mongoose.Promise,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

mongoose.connect(dbURI, dbOptions);
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
userView = require('./lib/user').view;
userViewSingle = require('./lib/user').viewSingle;
userPatchLevel = require('./lib/user').patchLevel;

// make sure required settings without defaults are availabe
if (typeof config.oauth.default.clientID === 'undefined' ||
  typeof config.oauth.default.clientSecret === 'undefined') {
  console.error('Cannot start because: %s %s'.red,
    (typeof config.oauth.default.clientID === 'undefined') ? 'clientID is missing;' : '',
    (typeof config.oauth.default.clientSecret === 'undefined') ? 'clientSecret is missing;' : ''
  );
  process.exit(4);
}

// make sure required settings are valid
if (config.oauth.startup.test) {
    debug('Requesting %s credentials at %s to test OAuth configuration', config.oauth.default.testScope, config.oauth.default.tokenURL);
    var options = {
        uri: config.oauth.default.tokenURL,
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        form: {
            client_id: config.oauth.default.clientID,
            client_secret: config.oauth.default.clientSecret,
            grant_type: "client_credentials",
            scope: config.oauth.default.testScope
        }
    };

    request(options, (err, response, body) => {
      let resp = {};
      if (body) {
          try {
              resp = JSON.parse(body);
          } catch (err) {
              debug('Error parsing startup test response: %s', err);
              return;
          }
      }
      debug('Response for OAuth test: %o', resp);
      
      if (err || resp.error) {
          debug('Error validating OAuth credentials (fail start? %s):\n\t Error: %o\n\tResponse: %o'.red,
              config.oauth.startup.failOnError.toString().toUpperCase(), err, resp);
          if (config.oauth.startup.failOnError) {
              console.error('Shutting down because OAuth startup test failed: %s'.red, JSON.stringify(resp));
              process.exit(5);
          }
      } else {
          if (resp.access_token && resp.scope === config.oauth.default.testScope) {
              debug('Retrieved access token and requested scope, all OK: %o'.green, resp);
          } else {
              debug('Did not receive expected response, continuing still... %o'.yellow, resp);
          }
      }
    });
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
        // new user is created here
        let newUser = new User({ orcid: params.orcid, name: params.name });
        newUser.save(err => {
          if (err) {
            return cb(err);
          } else {
            if (config.slack.enable) {
              slackbot.newOrcidUser(params.orcid);
            }

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
        debug('Error starting MongoStore: %s'.red, err);
      }
    });

    mongoStore.on('error', err => {
      debug('Error with MongoStore: %s'.red, err);
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

      let orcid = '';
      if (req.user && req.user.orcid) {
        orcid = ' | orcid: ' + req.user.orcid;
      }
      debug('REQUEST %s %s authenticated user: %s | session: %s %s',
        req.method, req.path, req.isAuthenticated(), req.session.id, orcid);

      next();
    });

    app.use('/api/v1/auth/login', passport.authenticate('oauth2'), (req, res) => {
      debug('Receiving callback from authentication service. User %s logged in with session %s.', req.user.orcid, req.sessionID);
      User.findOne({ orcid: req.user.orcid }, (err, user) => {
        if (err) {
          debug('Could not retrieve user who just logged in from database: %o', err);
        }
        user.lastseenAt = new Date();
        user.save((err) => {
          if (err) {
            debug('Could not update field "lastseenAt" for user who just logged in, error: %o', err);
          }
        });
      });

      res.redirect(config.login.redirect);
    });

    app.use('/api/v1/auth/logout', (req, res) => {
      // simple req.logout seems not to suffice for some users: http://stackoverflow.com/questions/13758207/why-is-passportjs-in-node-not-removing-session-on-logout
      req.logout();
      req.session.destroy(function (err) {
        debug('User session %s is logged out, and session is destroyed, error: %o', req.sessionID, err);
        res.redirect(config.logout.redirect);
      });
    });

    app.get('/api/v1/auth/whoami', (req, res) => {
      if (req.isAuthenticated()) {
        let answer = {
          orcid: req.user.orcid,
          name: req.user.name
        };
        res.send(answer);
      } else {
        res.status(401).send({ 'error': 'not authenticated' });
      }
    });

    app.get('/api/v1/user', userView);
    app.get('/api/v1/user/:id', userViewSingle);
    app.patch('/api/v1/user/:id', userPatchLevel);

    if (config.slack.enable) {
      slackbot.start((err) => {
        if (err) {
          debug('Error starting slackbot (disabling it now): %s'.red, err);
          config.slack.enable = false;
        }
      }, (done) => {
        debug('Slack bot enabled and configured - nice! Message response was %o', done);

        app.get('/api/v1/auth/slack', (req, res) => {
          if (req.isAuthenticated()) {
            let answer = {
              enabled: config.slack.enable
            };
            res.send(answer);
          } else {
            res.status(401).send({ 'error': 'not authenticated' });
          }
        });

        app.post('/api/v1/auth/slack/action', slackbot.incomingAction);
        app.post('/api/v1/auth/slack/options-load', slackbot.optionsLoad);
      });
    }

    app.listen(config.net.port, () => {
      debug('bouncer %s with API version %s waiting for requests on port %s',
        config.version,
        config.api_version,
        config.net.port);
        debug('new users get the level %s', config.user.level.default);
    });

  } catch (err) {
    callback(err);
  }

  callback(null);
}

// auto_reconnect is on by default and only for RE(!)connects, BUT not for the initial attempt: http://bites.goodeggs.com/posts/reconnecting-to-mongodb-when-mongoose-connect-fails-at-startup/
var dbBackoff = backoff.fibonacci({
  randomisationFactor: 0,
  initialDelay: config.mongo.initial_connection_initial_delay,
  maxDelay: config.mongo.initial_connection_max_delay
});

dbBackoff.failAfter(config.mongo.initial_connection_attempts);
dbBackoff.on('backoff', function (number, delay) {
  debug('Trying to connect to MongoDB in %sms', delay);
});
dbBackoff.on('ready', function (number, delay) {
  debug('Connect to MongoDB (#%s) ...', number);
  mongoose.connect(dbURI, dbOptions, (err) => {
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
  debug('Eventually giving up to connect to MongoDB'.red);
  process.exit(1);
});

dbBackoff.backoff();
