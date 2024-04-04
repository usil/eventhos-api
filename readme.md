# eventhos-api

<img src="./badges/badge-branches.svg">
<img src="./badges/badge-functions.svg">
<img src="./badges/badge-lines.svg">
<img src="./badges/badge-statements.svg">

## What is eventhos?

Eventhos is an open source platform that applies event-driven architecture principles to allow the user to orchestrate their system integrations using a simple user interface instead of complicated publisher and subscriber source codes in applications. You only need webhooks and rest APIs to integrate all your systems.

Here a minimalist High Level Diagram

![](https://www.planttext.com/api/plantuml/png/LOv13e0W30JlVGNXpXSCFp556Y11CBJgzyM3YhVjP9fTou9DzZL3eqMmX4oA3f9OUSOjAMIb-rrkO3hGm58RXiywoVsj3ZHu57J8f9u0eszQ2b7CD5R1MFiAxxkbullC2m00)

## How it works?

Basically you have to identify the producers (webhooks) and consumers (apis). Then using th UI you can make a contract between the incoming event produced by a webhook (source system) to the rest api in in the target system. So with this you will have a real time integration between the producer and consumer systems without the complexity of kafka or similars.

![image](https://github.com/usil/eventhos/assets/3322836/2fafd3ab-5ad0-4cd8-a413-78caa15069a2)

More uses cases and deep explanation [here](https://github.com/usil/eventhos/wiki/Real-Use-Cases) and [here](https://github.com/usil/eventhos-web/wiki/SendEvent)

## Features

- Register all systems (producers and  consumers)
- Create contracts between your systems
- Ouath2 Security
- Manuel retry  on error
- Event Dashboard to see the received events and all the details (request/response)
- Reply-To option
- Json binding to match between the webhook json and target api json
- Vanilla javascript to binding to match between the webhook json and target api json
- Mail on error with the details
- User Management

More details [here](https://github.com/usil/eventhos/wiki/Features)

## Demo

> In this repository you will find the code of the web artifact called **eventhos-api**. You will need the [api](https://github.com/usil/eventhos-web) to get all the eventhos platform ready to use or develop

To build and start this platform you need knowledge about nodejs and mysql. To get your own version in less than 3 minutes, follow this guide:

https://github.com/usil/eventhos?tab=readme-ov-file#usage-get-last-stable-version-default-secrets

If you don't have errors, you will be able to perform a get request to `http://localhost:2109`. You should see `ok` as response.

## Technologies

- Nodejs
- Knex
- Mysql

## Requirements

- nodejs >= 16
- mysql >= 5.5 (user with all privileges)

## Environment variables

Following the [third commandment](https://12factor.net/config) we use environment variables to handle the configurations

| Variable                             | Description                                    | Sample Value |
| :----------------------------------- | :--------------------------------------------- | :------------ |
| CPU_COUNT | How many cpu cores use | 1|
| CRYPTO_KEY | The secret key to encrypt | secret_key |
| DATA_BASE_ACQUIRE_CONNECTION_TIMEOUT | The timeout to acquire a connection using knex | 10000 |
| DATA_BASE_HOST | The eventhos platform database host | localhost |
| DATA_BASE_NAME | The eventhos platform database name | eventhos |
| DATA_BASE_PASSWORD | The eventhos platform database password | abcdefg |
| DATA_BASE_POOL_MAX | The maximum knex connection pool | 300 |
| DATA_BASE_POOL_MIN | The minimum knex connection pool | 100 |
| DATA_BASE_PORT | The eventhos platform database port | 3306|
| DATA_BASE_TIMEZONE | Required to sync the datetime in mysql2 nodejs library | +00:00  |
| DATA_BASE_USER | The eventhos platform database user | usr_eventhos  |
| ENVIRONMENT_ALIAS | Used in the subject on email error report, example: dev,prod,et. | Test|
| HTTP_BODY_SIZE_LIMIT |   Supported size of the json that interacts with the app   | 50mb|
| JWT_SECRET | The secret for the JWT | secret|
| LOG_FILE_PATH | Use a file for the logs | false|
| LOG_LEVEL | Set the logger level | debug|
| PORT | The application port | 2109 |
| RAW_SENSIBLE_PARAMS | Word to be obfuscated in mails and ui| credit_card, address |
| SMTP_CREDENTIAL_PASSWORD | Password of your mail server | changeme |
| SMTP_CREDENTIAL_USER | User of your mail server | noreply@acme.com  |
| SMTP_DEFAULT_RECIPIENT | Default recipients if there aren't recipients in a contract or if there are error before event's send| jane@acme.com|
| SMTP_ENABLE_SSL | Encrypt. <br> If your host is for gmail, your value should be true. <br> If your host is for office 365, your value should be false| true|
| SMTP_FROM_ALIAS | Should be able equal to the value of SMTP_CREDENTIAL_USER | noreply@acme.com or custom if your smtp allow it |
| SMTP_HOST | Sender identifier | smtp.gmail.com |
| SMTP_PORT | Communication endpoint that defines the routing of email transactions | 587|
| SMTP_TLS_CIPHERS | Are algorithms that help secure network connections that use Transport Layer Security | SSLv3 |
| TZ | Os timezone | America/Lima |


To use these variables in your developer workspace, check [this](https://github.com/usil/eventhos-api/wiki/for-developers)


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

Also you can use docker following [this](https://github.com/usil/eventhos-api/wiki/deployment_docker) guide

## Usage

For correct easy operation, the [ui](https://github.com/usil/eventhos-web) is required. 

Once the application is running you can either use the eventhos UI (recommended) or use the rest endpoints whic are documented [here](https://github.com/usil/eventhos-api/wiki) in the section **Endpoints**

## Developed libraries

Keeping in mind that software should be reused, we have developed the following libraries to build **eventhos-api**

| name | url | branch | description |
| -----| --- | -------| ----------- |
| advanced-settings | https://github.com/nodeboot/advanced-settings | main  | use env variables in the json settings |
| nodeboot-oauth2-starter | https://github.com/usil/nodeboot-oauth2-starter#fix-validator-middleware | 1.0.1 | oauth2 autonconfigure database and endpoints |

## How to Contribute

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