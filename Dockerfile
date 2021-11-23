FROM node:14

WORKDIR /app
COPY package.json .

RUN npm install
COPY . ./

RUN npm run build

EXPOSE 1000
ENV PORT 1000
ENTRYPOINT ["npm","run","start"]