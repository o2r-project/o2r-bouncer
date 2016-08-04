# o2r bouncer

Node.js implementation for the oauth2-authentification process of the [o2r web api](https://o2r.info/o2r-web-api)

Requirements:

```
nodejs >= 6.2
npm
```

## Dockerfile

This project includes a `Dockerfile` which can be built with
```
docker build -t o2r-bouncer .
```

The image can then be run and configured via environment variables. For convenience,
we include a `docker-compose` configuration, which can be run with

```
cd docker-compose && docker-compose up
# after you're done, shutdown and delete all volumes (data):
docker-compose down -v
```

### Available environment variables

* `BOUNCER_PORT`
  Define on which Port muncher should listen. Defaults to `8083`.
* `BOUNCER_MONGODB` __Required__
  Location for the mongo db. Defaults to `mongodb://localhost/`. You will very likely need to change this.
* `BOUNCER_MONGODB_DATABASE`
  Which database inside the mongo db should be used. Defaults to `muncher`.
* `OAUTH_URL_AUTHORIZATION`
  Authorization URL for the ORCiD OAuth2 API. Defaults to `https://orcid.org/oauth/authorize`.
* `OAUTH_URL_TOKEN`
  Token URL for the ORCiD OAuth2 API. Defaults to `https://orcid.org/oauth/token`.
* `OAUTH_SCOPE`
  Scope for the ORCiD API. Defaults to `/authenticate`.
* `OAUTH_CLIENT_ID`
  The client ID for your instance. __required__
* `OAUTH_CLIENT_SECRET`
  The client secret for your instance. __required__

### Generating the client ID & secret

See the [ORCiD Guide](https://members.orcid.org/api/accessing-public-api). As a redirect URI you need to set the path `/api/v1/auth/login`, relative to your base url. We highly recommend using https. The client ID & secret then need to be provided as environment variables or directly saved to the `config/config.js` file.

## License

o2r muncher is licensed under Apache License, Version 2.0, see file LICENSE.

Copyright (C) 2016 - o2r project.
