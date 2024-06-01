const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { WebSocket, WebSocketServer } = require("ws"); // Import the 'ws' library
const { findUser, registerUser, insertMessage } = require("./db/dbFuncs");
const jwt = require("jsonwebtoken");
// const authMiddleware = require("./middleware/authMiddleware");
const url = require("url");

const app = express();
const PORT = 3000;
const wsServer = new WebSocketServer({ port: 8080 });
const clients = new Set();

app.use(cors());
app.use(bodyParser.json());

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userInDB = await findUser({ username });
  if (userInDB) {
    if (userInDB.password === password) {
      const token = jwt.sign({ username: userInDB.username }, "changeItLater");
      res.json({ status: 200, token });
    } else {
      res.json({ status: 401 });
    }
  } else {
    res.json({ status: 401 });
  }
});

app.post("/users/add", async (req, res) => {
  const { username, password, repetPassword, email } = req.body;

  // Creating new user
  const newUser = {
    username,
    password,
    email,
  };
  let regStatus = false;

  if (password === repetPassword) {
    try {
      regStatus = await registerUser(newUser);
    } catch (error) {
      console.error("Error registering user:", error);
      return res.json({ status: 500, message: "Internal Server Error" });
    }
  } else {
    return res.json({ status: 400, message: "Passwords do not match" });
  }

  if (regStatus) {
    const token = jwt.sign({ username: newUser.username }, "changeItLater");
    res.json({ status: 200, token });
  } else {
    res.json({ status: 404, message: "User not found after registration" });
  }
});

const rooms = {};

wsServer.on("connection", (ws, req) => {
  const params = url.parse(req.url, true).query;
  const token = params.token;

  if (!token) {
    ws.close(1008, "Token required");
    return;
  }

  const username = jwt.verify(token, "changeItLater").username;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "join":
        if (!rooms[data.room]) {
          rooms[data.room] = [];
        }
        if (rooms[data.room].includes(ws)) {
        } else {
          ws.username = username;
          rooms[data.room].push(ws);
        }
        ws.room = data.room;
        broadcast(ws.room, `User ${ws.username} joined room ${ws.room}`, null);
        break;

      case "message":
        const date = new Date();
        insertMessage(
          username,
          {
            day: date.getDate() + 1,
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            second: date.getSeconds(),
          },
          ws.room,
          data.message
        );
        broadcast(ws.room, data.message, username);
        break;
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room] = rooms[ws.room].filter((client) => client !== ws);
      broadcast(ws.room, `User ${ws.username} left room ${ws.room}`, null);
    }
  });
});

function broadcast(room, message, username) {
  // rooms[room][0].room = room;
  if (rooms[room]) {
    rooms[room].forEach((client) => {
      if (client.room === room) {
        if (client.readyState === WebSocket.OPEN) {
          const mess = username ? `${username} : ${message}` : message;
          client.send(JSON.stringify({ message: mess }));
        }
      }
    });
  }
}

const s = app.listen(PORT, () => {
  console.log(`listening to ${PORT}`);
});
