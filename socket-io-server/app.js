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
let presenterId = null

io.on("connection", (socket) => {

    const log = (text) => {
        console.log(`[${socket.id}]\t${text}`)
    }

    const leave = () => {
        delete participants[socket.id]
        if (socket.id === presenterId) {
            presenterId = null
        }
        io.emit("remove-participant", { socketId: socket.id })
        socket.to(presenterId).emit("webrtc-disconnect", { from: socket.id })
        log("client left")
    }

    log("client connected")

    socket.emit("presenter", presenterId)

    socket.on("disconnect", () => {
        log("client disconnected")
        if (participants[socket.id]) leave()
    })

    // Called when video call is joined
    socket.on("join", (isPresenter) => {
        log("client joined")
        participants[socket.id] = {
            name: socket.id,
            isPresenter
        }
        io.emit("add-participant", { socketId: socket.id, participant: participants[socket.id] })
        if (isPresenter) {
            presenterId = socket.id
        } else
            // emit new spectator to presenter, if present
            if (presenterId) socket.to(presenterId).emit("request-offer", socket.id)
    })

    socket.on("leave", leave)

    socket.on("request-offer", ({ to }) => {
        socket.to(to).emit("request-offer", socket.id)
    })

    // Relay peer connection offers, answers and ICE candidates

    socket.on("webrtc-offer", ({ offer, to }) => {
        socket.to(to).emit("webrtc-offer", { offer, from: socket.id })
    })

    socket.on("webrtc-answer", ({ answer, to }) => {
        socket.to(to).emit("webrtc-answer", { answer, from: socket.id })
    })

    socket.on("webrtc-candidate", ({ candidate, to }) => {
        socket.to(to).emit("webrtc-candidate", { candidate, from: socket.id })
    })
})