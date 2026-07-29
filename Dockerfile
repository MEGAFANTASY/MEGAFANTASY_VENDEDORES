FROM python:3.12-alpine

WORKDIR /app

COPY . /app

# Fix Windows line endings in shell scripts
RUN apk add --no-cache dos2unix \
    && dos2unix /app/start.sh \
    && chmod +x /app/start.sh \
    && mkdir -p /data

EXPOSE 8000

CMD ["sh", "/app/start.sh"]
