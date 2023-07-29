FROM node:16

WORKDIR /usr/src/app
COPY package.json .
COPY package-lock.json .

RUN npm install
COPY . ./

RUN npm run build

EXPOSE 2109
ENV PORT 2109

COPY DockerfileEntryPoint.sh /usr/local/bin/DockerfileEntryPoint.sh
RUN chmod 744 /usr/local/bin/DockerfileEntryPoint.sh
ENTRYPOINT ["DockerfileEntryPoint.sh"]