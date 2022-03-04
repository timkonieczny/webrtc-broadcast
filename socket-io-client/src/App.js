import React, { useState, useEffect, useRef } from "react"
import socketIOClient from "socket.io-client"
import WebRTCManager from "./WebRTCManager"
const ENDPOINT = "http://127.0.0.1:4001"

function App() {
  const [presenterId, setPresenterId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [participants, setParticipants] = useState({})
  const localVideo = useRef(null)
  const remoteVideo = useRef(null)

  useEffect(() => {
    let presenterId

    const socket = socketIOClient(ENDPOINT)
    const manager = new WebRTCManager(socket, localVideo.current)
    socket.on("presenter", id => {
      presenterId = id
      manager.presenterId = presenterId
      setPresenterId(id)
    })
    socket.on("participants", setParticipants)
    socket.on("join", manager.onJoin.bind(manager))
    socket.on("webrtc-offer", (args) => { manager.onOffer.call(manager, args, remoteVideo.current) })
    socket.on("webrtc-answer", manager.onAnswer.bind(manager))
    socket.on("webrtc-candidate", manager.onCandidate.bind(manager))
    socket.on("webrtc-disconnect", manager.onDisconnect.bind(manager))
    setSocket(socket)
    return () => socket.disconnect()
  }, [])

  const presenter = () => {
    return presenterId ? presenterId : "Nobody"
  }

  const join = async isPresenter => {
    if (isPresenter) {
      navigator.getUserMedia(
        { video: true, audio: true },
        stream => {
          if (localVideo.current) {
            localVideo.current.srcObject = stream
            socket.emit("join", isPresenter)
          }
        },
        (error) => { console.log(error) }
      )
    } else socket.emit("join", isPresenter)
  }

  const leave = () => {
    socket.emit("leave")
  }

  const joinAsPresenterButton = () => {
    return presenterId ? "" : (<button onClick={() => { join(true) }}>join as presenter</button>)
  }

  const participantsList = () => {
    return Object.entries(participants).map(([key, value]) => {
      return (<li key={key}>
        {value.name}{key === presenterId ? " (Presenter)" : ""}
      </li>)
    })
  }

  const joinLeaveButtons = () => {
    return socket && participants[socket.id]
      ? (<button onClick={leave}>leave</button>)
      : (<div><button onClick={() => { join(false) }}>join</button>{joinAsPresenterButton()}</div>)
  }

  return (
    <div>
      <h1>Video broadcast</h1>
      <p>{presenter()} is presenting</p>
      {joinLeaveButtons()}
      <h2>Participants</h2>
      <ul>
        {participantsList()}
      </ul>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div>
          <h2>Local</h2>
          <video ref={localVideo} autoPlay muted style={{ border: "1px solid green", width: "16em", height: "9em" }} />
        </div>
        <div>
          <h2>Remote</h2>
          <video ref={remoteVideo} autoPlay muted style={{ border: "1px solid green", width: "16em", height: "9em" }} />
        </div>
      </div>
    </div>
  )
}

export default App