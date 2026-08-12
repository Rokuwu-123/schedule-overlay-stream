import { io } from "/socket.io/socket.io.esm.min.js";

const socket = io();
const uuid = document.getElementById("fileInput").value;
console.log("UUID:", uuid);

const overlayFrame = document.getElementById("overlayFrame");
const savedHTML = localStorage.getItem("overlayHTML");
if (savedHTML) overlayFrame.srcdoc = savedHTML;

socket.on(`overlay${uuid}`, (data) => {
    
  localStorage.setItem("overlayHTML", data.data);
  overlayFrame.srcdoc = data.data;
});
