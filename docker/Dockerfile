FROM node:14-alpine

WORKDIR /home/node/

ADD entrypoint.sh /entrypoint.sh

RUN apk add --no-cache --virtual .build-deps make gcc g++ python3 git \
    && apk add --no-cache bash sudo openntpd \
    && echo "servers pool.ntp.org" > /etc/ntpd.conf \
    && echo "servers time.google.com" >> /etc/ntpd.conf \
    && su node -c "yarn global add @arkecosystem/musig-server" \
    && su node -c "yarn cache clean" \
    && apk del .build-deps \
    && echo 'node ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

USER node
ENTRYPOINT ["bash", "-c", "/entrypoint.sh \"$@\"", "--"]
