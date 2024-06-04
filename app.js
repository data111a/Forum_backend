const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { WebSocket, WebSocketServer } = require("ws"); // Import the 'ws' library
const {
  findUser,
  registerUser,
  insertMessage,
  getMessages,
} = require("./db/dbFuncs");
const jwt = require("jsonwebtoken");
const path = require("path");
const authMiddleware = require("./middleware/authMiddleware");
const { createServer } = require("http");
const url = require("url");

const app = express();
const PORT = process.env.PORT || 3000;
const server = createServer(app);
const wsServer = new WebSocketServer({ server });
// const clients = new Set();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "/public")));

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

app.get("/messages/get/:category", async (req, res) => {
  const category = req.params.category;
  const ress = await getMessages(category);
  res.json(ress.data);
});

// !!!!!!!! THIS IS WEB SOCKET SECTION !!!!!!!! \\
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
        broadcast(ws.room, `Joined room ${ws.room}`, username);
        break;

      case "message":
        broadcast(ws.room, data.message, username);
        break;
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room] = rooms[ws.room].filter((client) => client !== ws);
      broadcast(ws.room, `Left room ${ws.room}`, username);
    }
  });
});

function broadcast(room, message, username) {
  // rooms[room][0].room = room;
  const date = new Date();
  const currDate = {
    day: date.getDate() + 1,
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };

  insertMessage(username, currDate, room, message);
  if (rooms[room]) {
    rooms[room].forEach((client) => {
      if (client.room === room) {
        if (client.readyState === WebSocket.OPEN) {
          const mess = message;
          client.send(
            JSON.stringify({
              message: mess,
              date: currDate,
              username,
            })
          );
        }
      }
    });
  }
}

const s = server.listen(PORT, () => {
  console.log(`listening to ${PORT}`);
});
