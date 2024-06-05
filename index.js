const http = require("http")
const Socket = require("websocket").server
const server = http.createServer(() => { })

const PORT = 3000

server.listen(PORT, () => {
    console.log(`Server Running At ${PORT}`)
})

const webSocket = new Socket({ httpServer: server })

const users = {}

webSocket.on('request', (req) => {
    const connection = req.accept()


    connection.on('message', (message) => {
        const data = JSON.parse(message.utf8Data)
        const user = users[data.name]

        switch (data.type) {
            case "store_user":
                console.log(data);
                if (!user) {
                    //our user exists
                    connection.send(JSON.stringify({
                        type: 'store_user_response',
                        data: 'user already exists'
                    }))
                    return
                }

                users[`${data.name}`] = {
                    name: data.name, conn: connection
                }
                break


            case "start_call":
                let userToCall = findUser(data.target)

                if (userToCall) {
                    connection.send(JSON.stringify({
                        type: "call_response", data: "user is ready for call"
                    }))
                } else {
                    connection.send(JSON.stringify({
                        type: "call_response", data: "user is not online"
                    }))
                }

                break

            case "create_offer":
                let userToReceiveOffer = findUser(data.target)

                if (userToReceiveOffer) {
                    userToReceiveOffer.conn.send(JSON.stringify({
                        type: "offer_received",
                        name: data.name,
                        data: data.data.sdp
                    }))
                }
                break

            case "create_answer":
                let userToReceiveAnswer = findUser(data.target)
                if (userToReceiveAnswer) {
                    userToReceiveAnswer.conn.send(JSON.stringify({
                        type: "answer_received",
                        name: data.name,
                        data: data.data.sdp
                    }))
                }
                break

            case "ice_candidate":
                let userToReceiveIceCandidate = findUser(data.target)
                if (userToReceiveIceCandidate) {
                    userToReceiveIceCandidate.conn.send(JSON.stringify({
                        type: "ice_candidate",
                        name: data.name,
                        data: {
                            sdpMLineIndex: data.data.sdpMLineIndex,
                            sdpMid: data.data.sdpMid,
                            sdpCandidate: data.data.sdpCandidate
                        }
                    }))
                }
                break
        }

    })

    connection.on('close', () => {

        for (const key in users) {
            if (users[key].conn === connection) {
                console.log(`Connection Closed for: ${key}`)
                delete users[key]
            }
        }

    })
})

const findUser = username => {
    return users[username]
}