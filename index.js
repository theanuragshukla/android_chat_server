require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const http = require("http").Server(app);
const bcrypt = require('bcryptjs')
const saltRounds = 10;
const db = require('./connection')
const jwt = require('jsonwebtoken')
const secret= process.env.JWT_SECRET_KEY
const Redis = require("ioredis");
const fs = require("fs");
const crypto = require('crypto')
const hash = async (message) => crypto.createHash('sha256').update(message).digest('hex')
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



// needs sanitization of data in every POST

app.post("/joinRoom",async (req, res) => {
	const {authToken, roomID} = req.body

	console.log(req.body)

	const dupQuery = `SELECT * FROM users WHERE uid = $1;`
	const dupVal = [authToken]
	const dups = await db.query(dupQuery, dupVal)
	if(dups.rows.length==0){
		res.status(403).json({status:"false", msg:"unauthorised"})
		return
	}

	const token = jwt.sign({uid:authToken, roomID:roomID, username:dups.rows[0].username}, secret, { expiresIn: '1d' })
	res.status(200).json({
		sessionToken: token,
	});
});


app.post("/login", async (req, res) => {
	const {username, uid} = req.body
	const uidHash = await hash(uid)
	const randomUID = crypto.randomBytes(16).toString('hex').substring(0, 32)
	const dupQuery = `SELECT * FROM users WHERE authtoken = $1;`
	const dupVal = [uidHash]
	const dups = await db.query(dupQuery, dupVal)
	console.log("dups:", dups.rows)
	if(dups.rows.length>0){
		res.status(200).json({token:dups.rows[0].uid})
		return
	}

	const query = `
	INSERT INTO users (uid, username, authtoken) VALUES ($1, $2, $3) RETURNING *;
	` 
	const {rows} = await db.query(query, [randomUID, username, uidHash])
	res.status(200).json({
		token: rows[0].uid
	});
});

const server = http.listen(port, () => {
	console.log(`running on ${port}`);
});

const io = require("socket.io")(server);

io.on("connection", (socket) => {
	sessionToken = socket.handshake.query.sessionID;
	const payload = jwt.decode(sessionToken,secret)
	socket.data.roomId = payload.roomId
	socket.data.username = payload.username
	socket.data.uid = payload.uid
	socket.on("newMessage", (msg) => {
		socket.broadcast.to(socket.data.roomId).emit("newMessage", {sender:socket.data.username, msg:msg})
	});
});
