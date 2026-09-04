# syntax=docker/dockerfile:1
FROM golang:1.27-alpine AS builder

WORKDIR /build
COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server ./
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server

FROM alpine:latest

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /build/server .

ENV DB_PATH=/data/campaign.db
ENV PORT=8080

EXPOSE 8080

CMD ["./server"]
