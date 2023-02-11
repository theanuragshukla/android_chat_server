require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;
const http = require("http").Server(app);

const Redis = require("ioredis");
const fs = require("fs");

const redis = new Redis({
  host: "redis-14759.c264.ap-south-1-1.ec2.cloud.redislabs.com",
  port: 14759,
  password: process.env.REDIS_PASS,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  console.log("request on /");
  res.status(200).json({ status: 200, msg: "hello world" });
});
app.post("/joinRoom", (req, res) => {
  console.log(req.body);
  res.status(200).json({
    sessionToken: "fheor87tyow48tq6347w560cncw89",
  });
});

app.post("/login", (req, res) => {
  console.log(req.body);
  res.status(200).json({
    token: "fheor87tyow48tq6347w560cncw89",
  });
});

const server = http.listen(port, () => {
  console.log(`running on ${port}`);
});

const io = require("socket.io")(server);

io.on("connection", (socket) => {
  socket.data.token = socket.handshake.query.sessionID;
  console.log(socket.handshake.query);
  socket.on("newMessage", (msg) => {});
});
