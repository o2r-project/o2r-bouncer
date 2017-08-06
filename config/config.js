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
var c = {};
c.version = {};
c.net = {};
c.mongo = {};
c.oauth = {};
var env = process.env;

// Information about bouncer
c.api_version = 1;
c.version = require('../package.json').version;

// network & database
c.net.port         = env.BOUNCER_PORT || 8083;
c.mongo.location   = env.BOUNCER_MONGODB || 'mongodb://localhost/';
c.mongo.database   = env.BOUNCER_MONGODB_DATABASE || 'muncher';
c.mongo.inital_connection_attempts = 30;
c.mongo.inital_connection_max_delay = 3000;
c.mongo.inital_connection_initial_delay = 1000;

// fix mongo location if trailing slash was omitted
if (c.mongo.location[c.mongo.location.length-1] !== '/') {
  c.mongo.location += '/';
}

// oauth providers
c.oauth.default = {
  authorizationURL: env.OAUTH_URL_AUTHORIZATION || 'https://orcid.org/oauth/authorize',
  tokenURL: env.OAUTH_URL_TOKEN || 'https://pub.orcid.org/oauth/token',
  callbackURL: env.OAUTH_URL_CALLBACK || 'http://localhost:' + c.net.port + '/api/v1/auth/login',
  clientID: env.OAUTH_CLIENT_ID,
  clientSecret: env.OAUTH_CLIENT_SECRET,
  scope: env.OAUTH_SCOPE || '/authenticate',
  passReqToCallback: true // this allows us to retrieve the orcid from the accesstoken response.
};
// session secret
c.sessionsecret = env.SESSION_SECRET || 'o2r';

c.login = {};
c.login.redirect = '/';

c.logout = {};
c.logout.redirect = '/';

// user levels
c.user = {};
c.user.level = {};
c.user.level.admin = 1000;
c.user.level.editor = 500;
c.user.level.known = 100;
c.user.level.userEdit = c.user.level.editor;
c.user.level.userEdit = c.user.level.editor;

// Slack
c.slack = {};
c.slack.enable = true;
c.slack.bot_token = process.env.SLACK_BOT_TOKEN;
c.slack.channel = {};
c.slack.channel.status = process.env.SLACK_CHANNEL_STATUS || '#monitoring';
c.slack.channel.userevents = process.env.SLACK_CHANNEL_USER ||'#monitoring';


module.exports = c;
