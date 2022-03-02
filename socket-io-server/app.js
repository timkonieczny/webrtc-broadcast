const express = require("express")
const http = require("http")
const socketIo = require("socket.io")

const port = process.env.PORT || 4001
const index = require("./routes/index")

const app = express()
app.use(index)

const server = http.createServer(app)

server.listen(port, () => console.log(`Listening on port ${port}`))

const io = socketIo(server)

io.on("connection", (socket) => {
    console.log("New client connected", socket.id)
    socket.emit("test", "Hello world")

    socket.on("disconnect", () => {
        console.log("Client disconnected")
    })
})