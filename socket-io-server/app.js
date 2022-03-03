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

const participants = {}
const participantSockets = {}
let presenterId = null
let presenterSocket = null

io.on("connection", (socket) => {

    const log = (text) => {
        console.log(`[${socket.id}]\t${text}`)
    }

    const leave = () => {
        delete participants[socket.id]
        delete participantSockets[socket.id]
        if (socket.id === presenterId) {
            presenterId = null
            presenterSocket = null
            socket.emit("presenter", presenterId)
        }
        io.emit("participants", participants)
        log("client left")
    }

    log("client connected")

    socket.emit("presenter", presenterId)

    socket.on("disconnect", () => {
        log("client disconnected")
        if (participants[socket.id]) leave()
    })

    socket.on("join", (isPresenter) => {
        log("client joined")
        participants[socket.id] = {
            name: socket.id
        }
        participantSockets[socket.id] = socket
        if (isPresenter) {
            presenterId = socket.id
            presenterSocket = socket
        } else {
            presenterSocket.emit("join", socket.id)
        }
        io.emit("participants", participants)
        io.emit("presenter", presenterId)
    })

    socket.on("leave", leave)

    socket.on("webrtc-offer", ({ offer, to }) => {
        participantSockets[to].emit("webrtc-offer", offer)
    })

    socket.on("webrtc-answer", (answer) => {
        presenterSocket.emit("webrtc-answer", { answer, socketId: socket.id })
    })

    socket.on("candidate", ({ candidate, socketId }) => {
        participantSockets[socketId].emit("candidate", { candidate, socketId: socket.id })
    })
})