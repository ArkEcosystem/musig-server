#!/usr/bin/env bash
sudo /usr/sbin/ntpd -s
sudo chown node:node -R /home/node
export PATH=$(yarn global bin):$PATH

MODE=${MODE:-test}

if [ "$MODE" = "test" ]; then
  ark-musig run --mode=test --port=${PORT:-3334} --coin=${COIN:-ark}
elif [ "$MODE" = "live" ]; then
  ark-musig run --mode=live --port=${PORT:-3330} --coin=${COIN:-ark}
else
  echo "Unknown mode!"
fi 
