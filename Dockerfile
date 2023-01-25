FROM node:16

WORKDIR /app
COPY package.json .
COPY package-lock.json .

RUN npm install
COPY . ./

RUN npm run build

EXPOSE 2109
ENV PORT 2109

ENTRYPOINT ["npm","run","start"]