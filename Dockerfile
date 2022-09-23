FROM node:14

WORKDIR /app
COPY package.json .
COPY package-lock.json .

RUN npm install
COPY . ./

RUN npm run build

EXPOSE 2109
ENV PORT 2109

RUN echo 'while true; do echo "$(date)" && sleep 2; done' > /bootstrap.sh
RUN chmod +x /bootstrap.sh

CMD /bootstrap.sh

#ENTRYPOINT ["/bootstrap.sh"]
#ENTRYPOINT ["npm","run","start"]