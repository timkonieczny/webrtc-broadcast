import React, { useState, useEffect } from "react"
import socketIOClient from "socket.io-client"
const ENDPOINT = "http://127.0.0.1:4001"

function App() {
  const [response, setResponse] = useState("")

  useEffect(() => {
    const socket = socketIOClient(ENDPOINT)
    socket.on("test", data => {
      setResponse(data)
    })
    return () => socket.disconnect()
  }, [])

  return (
    <div>
      <p>
        {response}
      </p>
    </div>
  )
}

export default App