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
            socket.emit("presenter", presenterId)
        }
        io.emit("participants", participants)
        socket.to(presenterId).emit("webrtc-disconnect", { from: socket.id })
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
        io.emit("participants", participants)
        if (isPresenter) {
            presenterId = socket.id
            io.emit("presenter", presenterId)
            Object.keys(participants).forEach(key => {
                if (key !== presenterId) socket.emit("join", key)
            })
        } else {
            if (presenterId) socket.to(presenterId).emit("join", socket.id)
        }
    })

    socket.on("leave", leave)

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