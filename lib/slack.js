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

const config = require('../config/config');
const slack = require('slack');
const debug = require('debug')('bouncer:slack');

// start listening to the slack team associated to the token
exports.start = function () {
  bot2r = slack.rtm.client();

  bot2r.started(function (payload) {
    debug('Started... payload from rtm.start: %s', JSON.stringify(payload));
  });

  bot2r.channel_joined(function (payload) {
    debug('payload from channel joined', JSON.stringify(payload));
  });

  bot2r.message(function (payload) {
    debug('[message] Incoming message: %s', JSON.stringify(payload));
  });

  bot2r.goodbye(function (payload) {
    debug('[goodbye] Server wants to close the connection soon... %s', JSON.stringify(payload));
  });

  bot2r.hello(function (payload) {
    debug('[hello] connected to server: %s', JSON.stringify(payload));

    joinChannelAndSayHello();
  });

  // connect!
  bot2r.listen({ token: config.slack.bot_token });
  //debug("bot2r: %s", Object.keys(bot2r));
};

joinChannelAndSayHello = function () {
  // bot is added to channel during adding the bot the the organisation
  //slack.channels.join({
  //  token: config.slack.bot_token,
  //  name: config.slack.channel.status
  //}, (err, data) => {
  //  if (err)
  //    debug(err);
  //  else
  //    debug('Response on joining channel %s: %s', config.slack.channel.status, JSON.stringify(data));
  //});

  slack.chat.postMessage({
    token: config.slack.bot_token,
    channel: config.slack.channel.status,
    text: 'I am now online from *badger* with callback URL `' + config.oauth.default.callbackURL + '`.'
  }, (err, data) => {
    if (err)
      debug(err);
    else
      debug('Response on posting startup message to %s: %s', config.slack.channel.status, JSON.stringify(data));
  });
}

exports.newOrcidUser = function (orcid) {
  let user_link = 'https://orcid.org/' + orcid;
  debug('Starting newUser chat for user %s', orcid);

  slack.chat.postMessage({
    token: config.slack.bot_token,
    channel: config.slack.channel.userevents,
    text: 'A new ORCID user `' + orcid + '` just registered',
    attachments: [
      {
        "text": "What kind of user level should " + user_link + " get?",
        "fallback": "0",
        "callback_id": "user_level",
        "color": "#004286",
        "attachment_type": "default",
        "actions": [
          {
            "name": "user_level",
            "text": "Stay new user",
            "type": "button",
            "value": "0"
          },
          {
            "name": "user_level",
            "text": "Known user",
            "type": "button",
            "value": config.user.level.known
          },
          {
            "name": "user_level",
            "text": "Editor",
            "type": "button",
            "value": config.user.level.editor,
            "style": "danger",
            "confirm": {
              "title": "Are you sure?",
              "text": "Wouldn't you want to reconsider?",
              "ok_text": "Yes",
              "dismiss_text": "No"
            }
          },
          {
            "name": "user_level",
            "text": "Admin",
            "type": "button",
            "value": config.user.level.admin,
            "style": "danger",
            "confirm": {
              "title": "Are you sure?",
              "text": "Wouldn't you want to reconsider?",
              "ok_text": "Yes",
              "dismiss_text": "No"
            }
          }
        ]
      }
    ]
  }, (err, data) => {
    if (err) {
      debug('Error posting new user message: %s', JSON.stringify(err));
    }
    else {
      if (data.ok) {
        debug('Message send was OK');
      } else {
        debug('Message send NOT OK. Response for posting new user message: %s', JSON.stringify(data));
      }
    }
  });
};

exports.incomingAction = (req, res) => {
  let payload = JSON.parse(req.body.payload);
  debug('[action]  %s', JSON.stringify(payload));
};

exports.optionsLoad = (req, res) => {
  let payload = JSON.parse(req.body.payload);
  debug('[options-load]  %s', JSON.stringify(payload));
};