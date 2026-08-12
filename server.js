import express from "express";
import http from "http";
import { Server } from "socket.io";
import crypto from "crypto";
import path from "path"
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");

const port = 3000;
const host = '0.0.0.0'

app.set("views", "app/views");
app.set("view engine", "ejs");
app.use(express.json());

app.get("/", (req, res) => {
  res.render("index");
});
app.use(express.static(path.join(__dirname, "app/views")));

app.get("/overlay/:uuid", (req, res) => {
  
  res.render("overlay",{uuid: req.params.uuid});
});

const server_http = http.createServer(app);
server_http.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});

const io = new Server(server_http);
import { data } from "./data.js";

io.on("connection", (socket) => {

  socket.on("createID", (settingID) => {
    
    const uuid = settingID && settingID !== null ? settingID : crypto.randomUUID();
    let usersData = data
    usersData.push({ id: socket.id, uuid: uuid });

    socket.emit("getID", uuid);
  })

  socket.on("setting", (data) => {

    io.emit(`${data.uuid}`, {setting : data.setting, savedMode : data.savedMode});
  });

  socket.on("html", (data) => {
    console.log("terima data", data.uuid)
    io.emit(`overlay${data.uuid}`, {data : data.html});
  })
})