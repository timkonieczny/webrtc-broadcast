import React, { useState, useEffect, useRef } from "react"
import socketIOClient from "socket.io-client"
const ENDPOINT = "http://127.0.0.1:4001"

function App() {
  const [presenterId, setPresenterId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [participants, setParticipants] = useState({})
  const localVideo = useRef(null)
  const remoteVideo = useRef(null)

  useEffect(() => {

    const config = {
      iceServers: [
        {
          urls: ["stun:stun.l.google.com:19302"]
        }
      ]
    }

    const { RTCPeerConnection, RTCSessionDescription } = window
    const peerConnections = {}
    let spectatorPeerConnection
    let presenterId

    const createPeerConnection = (socketId) => {
      const pc = new RTCPeerConnection(config)
      pc.onicecandidate = event => {
        console.log("onicecandidate")
        if (event.candidate)
          socket.emit("candidate", { socketId, candidate: event.candidate })
      }
      peerConnections[socketId] = pc
      return pc
    }

    const socket = socketIOClient(ENDPOINT)
    socket.on("presenter", id => {
      presenterId = id
      setPresenterId(id)
    })
    socket.on("participants", setParticipants)
    socket.on("join", async (socketId) => {
      console.log("receive join")
      const pc = createPeerConnection(socketId)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(new RTCSessionDescription(offer))

      socket.emit("webrtc-offer", { offer, to: socketId })
    })
    socket.on("webrtc-offer", async offer => {
      // spectator
      console.log("receive webrtc-offer")

      spectatorPeerConnection = createPeerConnection(presenterId)
      spectatorPeerConnection.ontrack = function ({ streams: [stream] }) {
        console.log("ontrack")
        if (remoteVideo) {
          remoteVideo.srcObject = stream
        }
      }

      await spectatorPeerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      )
      const answer = await spectatorPeerConnection.createAnswer()
      await spectatorPeerConnection.setLocalDescription(new RTCSessionDescription(answer))

      socket.emit("webrtc-answer", answer)
    })
    socket.on("webrtc-answer", async ({ answer, socketId }) => {
      // presenter
      console.log("receive webrtc-answer")
      const description = new RTCSessionDescription(answer)
      await peerConnections[socketId].setRemoteDescription(description)

      navigator.getUserMedia(
        { video: true, audio: true },
        stream => {
          stream.getTracks().forEach(track => peerConnections[socketId].addTrack(track, stream))
        },
        (error) => { console.log(error) }
      )
    })
    socket.on("candidate", ({ candidate, socketId }) => {
      // presenter
      console.log("receive candidate")
      peerConnections[socketId].addIceCandidate(new RTCIceCandidate(candidate))
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