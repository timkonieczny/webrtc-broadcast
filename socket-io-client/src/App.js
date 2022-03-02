import React, { useState, useEffect } from "react"
import socketIOClient from "socket.io-client"
const ENDPOINT = "http://127.0.0.1:4001"

function App() {
  const [presenterId, setPresenterId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [participants, setParticipants] = useState({})

  useEffect(() => {
    const socket = socketIOClient(ENDPOINT)
    socket.on("presenter", presenterId => {
      setPresenterId(presenterId)
    })
    socket.on("participants", participants => {
      setParticipants(participants)
    })
    setSocket(socket)
    return () => socket.disconnect()
  }, [])

  const presenter = () => {
    return presenterId ? presenterId : "Nobody"
  }

  const join = isPresenter => {
    socket.emit("join", isPresenter)
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
      <h1>{presenter()}</h1>
      {joinLeaveButtons()}
      <h2>Participants</h2>
      <ul>
        {participantsList()}
      </ul>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div>
          <h2>Local</h2>
          <video style={{ border: "1px solid green", width: "16em", height: "9em" }} />
        </div>
        <div>
          <h2>Remote</h2>
          <video style={{ border: "1px solid green", width: "16em", height: "9em" }} />
        </div>
      </div>
    </div>
  )
}

export default App