FROM mysql:5.7

COPY manage.sh /usr/local/bin/

COPY docker-entrypoint.sh /usr/local/bin/
RUN rm /entrypoint.sh
RUN ln -s /usr/local/bin/docker-entrypoint.sh /entrypoint.sh # backwards compat
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]