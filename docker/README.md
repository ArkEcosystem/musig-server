# ARK Multi-Signature Server Docker

## Usage

> _**NOTE**_ Defaults are: `MODE=test` && `PORT=3334`

For any other custom `MODE` or `PORT` an ENV VAR has to be exported in advance:

```bash
export MODE=live #or test
export PORT=6666 #or any other custom port number
export COIN=bind #possible options ark || bind (default == `ark`)
```

> Run it:

```bash
docker run -it --detach --cap-add=sys_nice --cap-add=sys_resource --cap-add=sys_time -v ~/.ark-musig-test:/home/node/.local -e MODE=${MODE:-test} -e PORT=${PORT:-3334} -e COIN=${COIN:-ark} -p ${PORT:-3334}:${PORT:-3334} --name ark-musig-test arkecosystem/musig-server
```

### Using `docker-compose`

```bash
git clone https://github.com/ArkEcosystem/musig-server.git
```

> Run it:

```bash
cd ark-musig-server/docker
docker-compose up -d
```

> Build and run your own image:

```bash
cd ark-musig-server/docker
docker-compose -f docker-compose-build.yml up -d
```
