import React, { useState, useEffect, useRef } from "react"
import socketIOClient from "socket.io-client"
const ENDPOINT = "http://127.0.0.1:4001"

function App() {
  const [presenterId, setPresenterId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [participants, setParticipants] = useState({})
  const [peerConnection1, setPeerConnection1] = useState({})
  const [peerConnection2, setPeerConnection2] = useState({})
  const localVideo = useRef(null)
  const remoteVideo = useRef(null)


  useEffect(() => {

    const { RTCPeerConnection } = window
    const peerConnection1 = new RTCPeerConnection()
    const peerConnection2 = new RTCPeerConnection()
    setPeerConnection1(peerConnection1)
    setPeerConnection2(peerConnection2)

    const socket = socketIOClient(ENDPOINT)
    socket.on("presenter", presenterId => {
      setPresenterId(presenterId)
    })
    socket.on("participants", participants => {
      setParticipants(participants)
    })
    socket.on("webrtc-offer", async offer => {
      // spectator
      const { RTCSessionDescription } = window

      await peerConnection2.setRemoteDescription(
        new RTCSessionDescription(offer)
      )
      const answer = await peerConnection2.createAnswer()
      await peerConnection2.setLocalDescription(new RTCSessionDescription(answer))

      socket.emit("webrtc-answer", answer)
    })
    socket.on("webrtc-answer", async answer => {
      // presenter
      const description = new RTCSessionDescription(answer)
      await peerConnection1.setRemoteDescription(description)

      navigator.getUserMedia(
        { video: true, audio: true },
        stream => {
          remoteVideo.current.srcObject = stream

          stream.getTracks().forEach(track => peerConnection1.addTrack(track, stream))
        },
        error => {
          console.log(error.message)
        }
      )
    })
    setSocket(socket)
    return () => socket.disconnect()
  }, [])

  const presenter = () => {
    return presenterId ? presenterId : "Nobody"
  }

  const join = async isPresenter => {
    socket.emit("join", isPresenter)
    if (isPresenter) {
      setUpLocalVideo()

      const offer = await peerConnection1.createOffer()
      const sessionDescription = new RTCSessionDescription(offer)
      await peerConnection1.setLocalDescription(sessionDescription)

      socket.emit("webrtc-offer", offer)
    }
  }

  const setUpLocalVideo = () => {
    navigator.getUserMedia({ video: true, audio: true },
      stream => {
        if (localVideo.current) localVideo.current.srcObject = stream
      },
      error => {
        console.log(error.message)
      }
    )
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