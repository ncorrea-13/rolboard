# syntax=docker/dockerfile:1
FROM golang:1.27-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download

COPY . ./
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:3.24

WORKDIR /app

COPY --from=builder /build/server .

ENV DB_PATH=/data/campaign.db
ENV PORT=8080

EXPOSE 8080

CMD ["./server"]
