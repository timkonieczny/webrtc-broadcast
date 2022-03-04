// Handles WebRTC connections between a presenter that broadcasts to spectators
export default class WebRTCManager {
    constructor(socket, localVideo) {
        this.socket = socket
        this.localVideo = localVideo

        this.peerConnections = {}
        this.elements = {}
        this.presenterId = null
        this.config = {
            iceServers: [
                {
                    urls: ["stun:stun.l.google.com:19302"]
                }
            ]
        }
    }

    // Handles ICE candidate exchange
    async onCandidate({ candidate, from }) {
        this.peerConnections[from].addIceCandidate(new RTCIceCandidate(candidate))
    }

    // Creates Peer connection and associates it with a socket
    createPeerConnection(socketId) {
        const pc = new RTCPeerConnection(this.config)
        pc.onicecandidate = event => {
            if (event.candidate)
                this.socket.emit("webrtc-candidate", { to: socketId, candidate: event.candidate })
        }

        this.peerConnections[socketId] = pc
        return pc
    }


    // PRESENTER CALLBACKS

    // Creates a peer connection offer and emits it to connected clients
    async onJoin(socketId) {
        const pc = this.createPeerConnection(socketId)

        const stream = this.localVideo.srcObject
        stream.getTracks().forEach(track => pc.addTrack(track, stream))

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        this.socket.emit("webrtc-offer", { offer: pc.localDescription, to: socketId })
    }

    // Handles clients' answers to the offer that was previously sent
    async onAnswer({ answer, from }) {
        const pc = this.peerConnections[from]
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
    }

    // Disconnects peer connection
    async onDisconnect({ from }) {
        if (this.peerConnections[from]) {
            this.peerConnections[from].close()
            delete this.peerConnections[from]
        }
    }


    // SPECTATOR CALLBACKS

    // Handles incoming offer and serts up peer connection on the spectator side
    async onOffer({ offer, from }, mediaElement) {
        const pc = this.createPeerConnection(from)
        this.elements[from] = mediaElement
        pc.ontrack = ({ streams: [stream] }) => {
            if (this.elements[from]) this.elements[from].srcObject = stream
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(new RTCSessionDescription(answer))

        this.socket.emit("webrtc-answer", { answer, to: from })
    }
}