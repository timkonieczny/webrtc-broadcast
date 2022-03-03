export default class WebRTCManager {
    constructor(socket, localVideo, remoteVideo) {
        this.socket = socket
        this.localVideo = localVideo
        this.remoteVideo = remoteVideo

        this.peerConnections = {}
        this.spectatorPeerConnection = null
        this.presenterId = null
        this.config = {
            iceServers: [
                {
                    urls: ["stun:stun.l.google.com:19302"]
                }
            ]
        }
    }

    async onCandidate({ candidate, from }) {
        this.peerConnections[from].addIceCandidate(new RTCIceCandidate(candidate))
    }

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

    async onJoin(socketId) {
        const pc = this.createPeerConnection(socketId)

        const stream = this.localVideo.srcObject
        stream.getTracks().forEach(track => pc.addTrack(track, stream))

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        this.socket.emit("webrtc-offer", { offer: pc.localDescription, to: socketId })
    }

    async onAnswer({ answer, from }) {
        const pc = this.peerConnections[from]
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
    }

    async onDisconnect({ from }) {
        if (this.peerConnections[from]) {
            this.peerConnections[from].close()
            delete this.peerConnections[from]
        }
    }


    // SPECTATOR CALLBACKS

    async onOffer({ offer, from }) {
        this.spectatorPeerConnection = this.createPeerConnection(this.presenterId)
        this.spectatorPeerConnection.ontrack = ({ streams: [stream] }) => {
            if (this.remoteVideo) this.remoteVideo.srcObject = stream

        }

        await this.spectatorPeerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await this.spectatorPeerConnection.createAnswer()
        await this.spectatorPeerConnection.setLocalDescription(new RTCSessionDescription(answer))

        this.socket.emit("webrtc-answer", { answer, to: from })
    }
}