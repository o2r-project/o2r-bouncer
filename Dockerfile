FROM alpine:3.4
MAINTAINER o2r-project, https://o2r.info

RUN apk add --no-cache \
  nodejs \
  git \
  && git clone --depth 1 -b master https://github.com/o2r-project/o2r-bouncer /bouncer \
  && apk del git \
  && rm -rf /var/cache

WORKDIR /bouncer
RUN npm install

# dirty hack because global-tunnel is unmaintained and needs newer tunnel version
RUN sed -i 's/0\.0\.2/0\.0\.4/' node_modules/global-tunnel/package.json \
  && npm install

CMD npm start
