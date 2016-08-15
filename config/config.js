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
var c = {};
c.version = {};
c.net = {};
c.mongo = {};
c.oauth = {};
var env = process.env;

// Information about bouncer
c.version.major  = 0;
c.version.minor  = 1;
c.version.bug    = 0;
c.version.api    = 1;

// network & database
c.net.port         = env.BOUNCER_PORT || 8083;
c.mongo.location   = env.BOUNCER_MONGODB || 'mongodb://localhost/';
c.mongo.database   = env.BOUNCER_MONGODB_DATABASE || 'muncher';

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

module.exports = c;
