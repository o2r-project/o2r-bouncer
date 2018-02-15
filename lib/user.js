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

var c = require('../config/config');
var debug = require('debug')('bouncer:user');

var User = require('../lib/model/user');

exports.viewSingle = (req, res) => {
  var id = req.params.id;
  var answer = { id };

  debug('User information about %s requested.', id);

  User.findOne({ orcid: id }).exec((err, user) => {
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (err || user == null) {
      res.status(404).send({ error: 'no user with this id' });
    } else {
      // show public information
      answer.name = user.name;

      // show level and lastseen only to editor users and the user herself
      if (req.isAuthenticated()
        && (req.user.level >= c.user.level.userEdit
          || user.orcid === id)) {
        answer.level = user.level;
        answer.lastseen = user.lastseenAt;
      }

      res.status(200).send(answer);
    }
  });
};

exports.view = (req, res) => {
  var answer = {};
  var limit = parseInt(req.query.limit || Number.MAX_SAFE_INTEGER, 10);
  var start = parseInt(req.query.start || 1, 10) - 1;

  if(!Number.isSafeInteger(limit)) {
    res.status(400).send({ error: 'limit must be an integer' });
  } else if (!Number.isSafeInteger(start)) {
    res.status(400).send({ error: 'start must be an integer' });
  } else if (limit < 1) {
    res.status(400).send({ error: 'limit must be larger than 0' });
  } else if (start < 0) {
    res.status(400).send({ error: 'start must be larger than 0' });
  } else {
    User.find().select('orcid').skip(start).limit(limit).exec((err, users) => {
      if (err) {
        res.status(500).send({ error: 'query failed' });
      } else {
        if (users.length <= 0) {
          debug('No user found for this search');
        }

        answer.results = users.map(user => {
          return user.orcid;
        });
        res.status(200).send(answer);
      }
    });
  }
};

exports.patchLevel = (req, res) => {
  var id = req.params.id;

  // check user level
  if (!req.isAuthenticated()) {
    res.status(401).send('{"error":"user is not authenticated"}');
    return;
  }
  if (req.user.level < c.user.level.userEdit) {
    res.status(401).send('{"error":"user level does not allow edit"}');
    return;
  }

  debug('User %s should be patched with %o by user %s (%s)', id, req.query, req.user.name, req.user.orcid);

  var newLevel = parseInt(req.query.level, 10);

  if (isNaN(newLevel)) {
    res.status(400).send('{"error":"parameter \'level\' could not be parsed as an integer"}');
    return;
  }

  let update = { level: newLevel };
  User.findOneAndUpdate({ orcid: id }, update, { new: true, upsert: false }, function (err, user) {
    if (err) {
      res.status(500).send({ error: 'could not save edit' });
      return;
    }

    if (typeof user !== 'undefined' && user !== null) {
      debug('Updated user level of %s to %s', id, user.level);
      let answer = { id };
      answer.name = user.name;
      answer.level = user.level;

      res.status(200).send(answer);
    } else {
      debug('Could not update user level of %s: returns %o', id, user);
      res.status(400).send({ error: 'user not found' });
    }

  });
};