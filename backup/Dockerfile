FROM alpine:3.19

RUN apk add --no-cache mongodb-tools rclone bash dcron

COPY backup.sh /backup.sh
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /backup.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
