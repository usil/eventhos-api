# Eventhos 0.0.2

<img src="./badges/badge-branches.svg">
<img src="./badges/badge-functions.svg">
<img src="./badges/badge-lines.svg">
<img src="./badges/badge-statements.svg">

Eventhos api, which endpoints will be consumed by the eventhos UI. You can check them in the endpoints section.

## What is eventhos?

Eventhos is an open source system/platform that applies event based architecture principles to let an average user choreography the diverse systems, SaaS or microservice that an enterprise uses, interconnecting them.

To take a deep look into how eventhos works check the [documentation](https://github.com/usil/eventhos-docs).

## Requirements

- nodejs = 14
- mysql >= 5.5 (user with all privileges)

## Cluster Mode

Modify the CPU_COUNT environment variables with the number of CPUs that you want to use.

## Database

For the moment eventhos works with a mysql database using knex, you should pass your database information in the environment variables.

## Security

To secure endpoints and generate users, clients and their respective credentials we use the [oauth2-starter library](https://github.com/usil/nodeboot-oauth2-starter/wiki). This library will create a `credentials.txt` file with the admin credentials.

Eventhos will create the authentication database in the same database that you passed for eventhos. In the environment variables you will also need to pass a jwt secret and a crypto secret.

Use the client id, secret and access token to manage the access of a system to certain events.

## Docker

Just run `docker-compose up -d`

## Usage For Development

First run `npm install`. To start development run `npm run dev:start`. By default the app runs in the 2109 port.

## Usage For Production

For production you should build your app `npm run build` will create a dist file. Then run `npm start`. By default the app runs in the 2109 port.

## General usage

Once the application is running you can either use the eventhos platform (recommended) or use the endpoints that this api has.

### Basic workflow

First using the `/auth/client` endpoint to crate a client. Check the [oauth2-starter library](https://github.com/usil/nodeboot-oauth2-starter/wiki) to know all of the authentication endpoints.

To use eventhos first you should create a `system` then create an `event` for this system, after that create other `system` but for this one create an `action`. To _link_ the event with the action create a `contract`.

Finally make someone use the `/event?access-key=<client-token>&event-identifier=<event-identifier>` endpoint to call an `event` that will trigger one or more `contracts` those contract will make some `actions` happen.

To know more about `system`, `event` and `contract` take a look at the full [documentation](https://github.com/usil/eventhos-docs).

## Environment variables

| Variable                             | Description                                    | Default Value |
| ------------------------------------ | ---------------------------------------------- | ------------- |
| DATA_BASE_NAME                       | The eventhos platform database name            | eventhos      |
| DATA_BASE_HOST                       | The eventhos platform database host            | localhost     |
| DATA_BASE_PORT                       | The eventhos platform database port            | 3306          |
| DATA_BASE_USER                       | The eventhos platform database user            | usr_eventhos  |
| DATA_BASE_PASSWORD                   | The eventhos platform database password        | abcdefg       |
| CPU_COUNT                            | How many cpu cores use                         | 1             |
| PORT                                 | The application port                           | 2109          |
| JWT_SECRET                           | The secret for the JWT creation                | secret        |
| CRYPTO_KEY                           | The secret key to encrypt                      | secret_key    |
| DATA_BASE_ACQUIRE_CONNECTION_TIMEOUT | The timeout to acquire a connection using knex | 10000         |
| DATA_BASE_POOL_MIN                   | The minimum knex connection pool               | 100           |
| DATA_BASE_POOL_MAX                   | The maximum knex connection pool               | 300           |
| USE_QUEUE                            | Use the queue integration?                     | false         |
| QUEUE_HOST                           | The host of the queue manager                  | localhost     |
| QUEUE_PORT                           | The port of the queue manager                  | 61613         |
| QUEUE_USER                           | A user to access the queue manager             | eventhos      |
| QUEUE_PASSWORD                       | A user password to access the queue manager    | secret        |
| QUEUE_DESTINATION                    | The queue destination                          | eventhos      |
| QUEUE_HEART_BEAT                     | The hearth beat for the queue manager          | 0,0           |
| QUEUE_HEADERS_HOST                   | The host to send in the headers                | /             |
| LOG_FILE_PATH                        | Use a file for the logs                        | false         |
| LOG_LEVEL                            | Set the logger level                           | debug         |

You should create an .env file with the following:

```text
DATA_BASE_NAME = eventhos
DATA_BASE_HOST = localhost
DATA_BASE_PORT = 3306
DATA_BASE_USER = usr_eventhos
DATA_BASE_PASSWORD = abcdefg
CPU_COUNT = 1
PORT = 2109
JWT_SECRET = secret
CRYPTO_KEY = secret_key
DATA_BASE_ACQUIRE_CONNECTION_TIMEOUT = 10000
DATA_BASE_POOL_MIN = 100
DATA_BASE_POOL_MAX = 300
```

Only add the following if you want to use the queue integration:

```text
USE_QUEUE = true
QUEUE_HOST = localhost
QUEUE_HEADERS_HOST = /
QUEUE_PORT = 61613
QUEUE_USER = eventhos
QUEUE_PASSWORD = secret
QUEUE_DESTINATION = eventhos
QUEUE_HEART_BEAT = 0,0
```

## License

[MIT](./LICENSE)

## Contributors

<table>
  <tbody>
    <td>
      <img src="https://i.ibb.co/88Tp6n5/Recurso-7.png" width="100px;"/>
      <br />
      <label><a href="https://github.com/TacEtarip">Luis Huertas</a></label>
      <br />
    </td>
    <td>
      <img src="https://avatars0.githubusercontent.com/u/3322836?s=460&v=4" width="100px;"/>
      <br />
      <label><a href="http://jrichardsz.github.io/">JRichardsz</a></label>
      <br />
    </td>
  </tbody>
</table>
```
