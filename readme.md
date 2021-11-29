# Eventhos Demo 1.0.0

<img src="./coverage/badge-branches.svg">
<img src="./coverage/badge-functions.svg">
<img src="./coverage/badge-lines.svg">
<img src="./coverage/badge-statements.svg">

The microservice to use Eventhos.

## Requirements

- nodejs >= 14

## Cluster Mode

Modify the CPU_COUNT environment variables with the number of CPUs that you want to use.

## Environment

You should create an .env file with the following:

```text
DATA_BASE_NAME = eventhos
DATA_BASE_HOST = <your-ip>
DATA_BASE_PORT = 3306
DATA_BASE_USER = root
DATA_BASE_PASSWORD = abcdefg
PORT = 1000
CPU_COUNT = <number of CPUs to use>
```

## Docker

Just run `docker-compose up -d`

## Usage For Development

First run `npm install`, then run `npm fund`. To start development run `npm run dev:start`.

## Usage For Production

For production you should build your app `npm run build` will create a dist file. Add a `settings.json` file in the dist folder. Then run `npm start`.

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
