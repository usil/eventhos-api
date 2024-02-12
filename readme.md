# eventhos-api

<img src="./badges/badge-branches.svg">
<img src="./badges/badge-functions.svg">
<img src="./badges/badge-lines.svg">
<img src="./badges/badge-statements.svg">

## What is eventhos?

Eventhos is an open source platform that some principles of Event Driven Architectures to improve the integration or choreography between company systems.

Here a minimalist High Level Diagram

![](https://www.planttext.com/api/plantuml/png/LOv13e0W30JlVGNXpXSCFp556Y11CBJgzyM3YhVjP9fTou9DzZL3eqMmX4oA3f9OUSOjAMIb-rrkO3hGm58RXiywoVsj3ZHu57J8f9u0eszQ2b7CD5R1MFiAxxkbullC2m00)

To take a deep look into how eventhos works check the [documentation](https://github.com/usil/eventhos/wiki).

In this repository you will find the code of the artifact called **eventhos-api**

## Requirements

- nodejs >= 16
- mysql >= 5.5 (user with all privileges)

## Environment variables

Following the [third commandment](https://12factor.net/config) we use environment variables to handle the configurations

| Variable                             | Description                                    | Default Value |
| :----------------------------------- | :--------------------------------------------- | :------------ |
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
| SMTP_HOST                   | Sender identifier               |           |
| SMTP_PORT                   | Communication endpoint that defines the routing of email transactions               |           |
| SMTP_CREDENTIAL_USER                   | User of your mail server               |            |
| SMTP_CREDENTIAL_PASSWORD                   | Password of your mail server               |           |
| SMTP_ENABLE_SSL                   | Encrypt. <br> If your host is for gmail, your value should be true. <br> If your host is for office 365, your value should be false               | true           |
| SMTP_TLS_CIPHERS                   | Are algorithms that help secure network connections that use Transport Layer Security               |    SSLv3        |
| SMTP_DEFAULT_RECIPIENT                   | Default recipients if there aren't recipients in a contract or if there are error before event's send               |            |
| SMTP_FROM_ALIAS                   | Should be able equal to the value of SMTP_CREDENTIAL_USER           |            |
| LOG_FILE_PATH                        | Use a file for the logs                        | false         |
| LOG_LEVEL                            | Set the logger level                           | debug         |
| RAW_SENSIBLE_PARAMS                          | Names of the keys that have sensitive values ​​sent when executing an event. <br>The values ​​of the keys sent here will be hidden. <br> Example: event-key, access-key, newkey                           |          |
| HTTP_BODY_SIZE_LIMIT     |   Supported size of the json that interacts with the app   | 50mb         |
| ENVIRONMENT_ALIAS     |    The value that you declare in this variable will be seen in the subject on email error report, example: dev,prod,et.        |


To use these variables in your developer workspace, check [this](https://github.com/usil/eventhos-api/wiki/for-developers)


## Database

Eventhos works with a mysql database using knex, you should pass your database information in the environment variables.

## Security

Authentication and authorization are based on a custom oauth2 implementation [oauth2-starter library](https://github.com/usil/nodeboot-oauth2-starter/wiki). 

This library will create a `credentials.txt` file with the admin credentiaLS in the **/tmp** folder. 

:loudspeaker: Change it after the first login

## Automated start

Just run `docker-compose up -d`

## Manual start (developers)

Export the required env variables or create a .env

```js
npm install
npm run dev
```

By default the app runs in the **2109** port.

## Manual start (production)

Export the required env variables or create a .env

```js
npm install
npm run build
npm run start
```
By default the app runs in the 2109 port.

## Usage

Once the application is running you can either use the eventhos platform (recommended) or use the endpoints that this api has.

## Developed libraries

| name | url | branch | description |
| -----| --- | -------| ----------- |
| advanced-settings | https://github.com/nodeboot/advanced-settings | main  | - |
| nodeboot-oauth2-starter | https://github.com/usil/nodeboot-oauth2-starter#fix-validator-middleware | fix-validator-middleware | - |

## Configurations
[Advanced configurations](https://github.com/usil/eventhos-api/wiki/for-developers#advanced-configurations)

## Contributions

Check this https://github.com/usil/eventhos-api/wiki/Contributions


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
    <td>
      <img src="https://avatars.githubusercontent.com/u/66818290?s=400&u=d2f95a7497efd7fa830cf96fc2dc01120f27f3c5&v=4" width="100px;"/>
      <br />
      <label><a href="https://github.com/iSkyNavy">Diego Ramos</a></label>
      <br />
    </td>
  </tbody>
</table>