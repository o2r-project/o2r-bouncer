# o2r bouncer

[![Build Status](https://travis-ci.org/o2r-project/o2r-bouncer.svg?branch=master)](https://travis-ci.org/o2r-project/o2r-bouncer) [![](https://images.microbadger.com/badges/version/o2rproject/o2r-bouncer.svg)](https://microbadger.com/images/o2rproject/o2r-bouncer "Get your own version badge on microbadger.com")

Node.js implementation for the OAuth2-based authentication process of the [o2r web api](https://o2r.info/o2r-web-api).

Requirements:

- nodejs `>= 6.2`
- npm

## Dockerfile

This project includes a `Dockerfile` which can be built and run with

```bash
docker build -t bouncer .

docker run --name mongodb -d mongo:3.4
docker run --name testbouncer -it -p 8383:8083 --link mongodb:mongodb -e OAUTH_CLIENT_ID=none -e OAUTH_CLIENT_SECRET=none -e OAUTH_STARTUP_TEST=false -e BOUNCER_MONGODB=mongodb://mongodb:27017 -e DEBUG=* bouncer
```

### Available environment variables

* `BOUNCER_PORT`
  Define on which Port muncher should listen. Defaults to `8083`.
* `BOUNCER_MONGODB` __Required__
  Location for the mongo db. Defaults to `mongodb://localhost:27017/`. You will very likely need to change this.
* `BOUNCER_MONGODB_DATABASE`
  Which database inside the mongo db should be used. Defaults to `muncher`.
* `BOUNCER_DEFAULT_USER_LEVEL`
  What is the [user level](http://o2r.info/o2r-web-api/user/#user-levels) given to a new user upon registration? Defaults to `100` (known users).
* `OAUTH_URL_AUTHORIZATION`
  Authorization URL for the ORCID OAuth2 API. Defaults to `https://orcid.org/oauth/authorize`.
* `OAUTH_URL_TOKEN`
  Token URL for the ORCID OAuth2 API. Defaults to `https://orcid.org/oauth/token`.
* `OAUTH_SCOPE`
  Scope for the ORCID API. Defaults to `/authenticate`.
* `OAUTH_CLIENT_ID` __Required__
  The client ID for your instance.
* `OAUTH_CLIENT_SECRET` __Required__
  The client secret for your instance.
* `http_proxy` __Required__
  HTTP(S) Proxy used for the OAuth process. This will be needed if your server is behind a proxy/firewall.
* `SLACK_BOT_TOKEN`
  Authentication token for a bot app on Slack. See section [Slack bot](#slack-bot).
* `SLACK_VERIFICATION_TOKEN`
  Token provided by Slack for interactive messages and events, to be used to verify that requests are actually coming from Slack.
* `SLACK_CHANNEL_STATUS`
  Channel to post status messages to, defaults to `#monitoring`.
* `SLACK_CHANNEL_USER`
  Channel to post messages on user events, defaults to `#monitoring`.
* `SLACK_USERNAMES_WHITELIST`
  A regex to check Slack usernames, which are allowed to react to interactive messages. Defaults to `.*` and the created regex is always case _in_sensitive. To allow specific users only, use e.g. `\\b(claerbout|peng|stodden)\\b` (case insensitive match of full words `claerbout`, `peng`, `stodden`).
* `OAUTH_STARTUP_TEST`, `OAUTH_STARTUP_FAIL_ON_ERROR`, `OAUTH_SCOPE_TEST`
  Use these parameters to configure testing of the OAuth configuration at startup by requesting the configured scope (default: `/read-public`), both boolean variables default to `true`.

### Used exit codes

* `1` Maximum attempts to connect to MondoDB reached
* `4` OAuth credentials configuration missing
* `5` OAuth startup test failed

### Generating the client ID & secret

See the ORCID documentation [on accessing the public API](https://members.orcid.org/api/accessing-public-api) and [signing-in with ORCID iD](https://members.orcid.org/api/integrate/orcid-sign-in). As a redirect URI you need to set the path `/api/v1/auth/login`, relative to your base URL. We highly recommend using `https`. The client ID & secret then need to be provided as environment variables or directly saved to the `config/config.js` file.

When using the [o2r-guestlister](https://github.com/o2r-project/o2r-guestlister) offline OAuth2 implementation, the client ID and secret have to be identical to the values the o2r-guestlister is using.
As long as these values match, they can be chosen freely.

To match the default guestlister configuration the bouncer has to be configured to access the correct OAuth server:

* `OAUTH_URL_AUTHORIZATION=http://.../oauth/authorize`
* `OAUTH_URL_TOKEN=http://.../oauth/token`
* `OAUTH_URL_CALLBACK=http://.../api/v1/auth/login`

Keep in mind that `OAUTH_URL_TOKEN` is called by the bouncer, which means it has to be configured in respect to the bouncer's environment.
This is especially relevant when bouncer is running inside a container.
While `localhost` might work for development outside containers, the URL must use the proper host name in configurations based on docker-compose.

`OAUTH_URL_AUTHORIZATION` and `OAUTH_URL_CALLBACK` are called by the client.

### Sessions

The [express-session](https://github.com/expressjs/session) middleware is used to manage logged in users.
After logging in via `/api/v1/auth/login`, a session cookie containing encoded information to identify the user is stored in the database. 

The same cookie is sent to the client and allows continuous access to the o2r platform.

## Slack bot

Documentation of Slack API: https://api.slack.com/bot-users, especially [interactive messages](https://api.slack.com/interactive-messages).

The bot needs the permissions to join channels and post to them.
Add the following scopes to the app in the section "OAuth & Permissions" in the bot's apps page.

- `channels:write`
- `chat:write:bot`
- `incoming-webhook`
- `bot`

While adding the app to your Slack organisation, make sure to allow the bot to post the the desired channel.

In the o2r bot app's configuration page for Interactive Messages on Slack, enter the following endpoints:

- Request URL: https://o2r.uni-muenster.de/api/v1/auth/slack/action
- Options Load URL: (currently not used!) https://o2r.uni-muenster.de/api/v1/auth/slack/options-load

### Local bot development

Start ngrok with `ngrok http 8083` and enter the public endpoint pointing to your local server at https://api.slack.com/apps/A6J6CDLQK/interactive-messages. ngrok also has a useful web interface at http://127.0.0.1:4040/inspect/http on all incoming requests.

## Development

You must provide the required settings as environment variables, either at start time or via the debug configuration of your IDE.

To start bouncer with the required environment replace the respective settings with the actual values (check your ORCID iD page) and execute the following command.

```bash
DEBUG=* OAUTH_CLIENT_ID=clientid OAUTH_CLIENT_SECRET=secret SLACK_VERIFICATION_TOKEN=token SLACK_BOT_TOKEN=xoxb-token npm start
```

You can then start the authentication process by opening http://localhost:8083/api/v1/auth/login and see who you are afterwards at http://localhost:8083/api/v1/auth/whoami.

## License

o2r bouncer is licensed under Apache License, Version 2.0, see file LICENSE.

Copyright (C) 2016 - o2r project.
