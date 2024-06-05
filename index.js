const http = require("http");
const WebSocketServer = require("websocket").server;
const server = http.createServer(() => { });

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Server Running At ${PORT}`);
});

const webSocket = new WebSocketServer({ httpServer: server });

const users = {};

webSocket.on('request', (req) => {
    const connection = req.accept();

    connection.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message.utf8Data);
        } catch (error) {
            console.error("Invalid JSON:", error);
            connection.send(JSON.stringify({
                type: 'error',
                data: 'Invalid JSON'
            }));
            return;
        }

        const user = users[data.name];

        switch (data.type) {
            case "store_user":
                if (user) {
                    connection.send(JSON.stringify({
                        type: 'store_user_response',
                        data: 'user already exists'
                    }));
                    return;
                }

                users[data.name] = {
                    name: data.name,
                    conn: connection
                };
                connection.send(JSON.stringify({
                    type: 'store_user_response',
                    data: 'user stored successfully'
                }));
                break;

            case "start_call":
                handleStartCall(connection, data);
                break;

            case "create_offer":
                handleOffer(connection, data);
                break;

            case "create_answer":
                handleAnswer(connection, data);
                break;

            case "ice_candidate":
                handleIceCandidate(connection, data);
                break;

            default:
                console.warn("Unknown message type:", data.type);
                connection.send(JSON.stringify({
                    type: 'error',
                    data: 'Unknown message type'
                }));
                break;
        }
    });

    connection.on('close', () => {
        for (const key in users) {
            if (users[key].conn === connection) {
                console.log(`Connection Closed for: ${key}`);
                delete users[key];
            }
        }
    });
});

const findUser = (username) => {
    return users[username];
}

const handleStartCall = (connection, data) => {
    const userToCall = findUser(data.target);

    connection.send(JSON.stringify({
        type: "call_response",
        data: userToCall ? "user is ready for call" : "user is not online"
    }));
}

const handleOffer = (connection, data) => {
    const userToReceiveOffer = findUser(data.target);

    if (userToReceiveOffer) {
        userToReceiveOffer.conn.send(JSON.stringify({
            type: "offer_received",
            name: data.name,
            data: data.data.sdp
        }));
    }
}

const handleAnswer = (connection, data) => {
    const userToReceiveAnswer = findUser(data.target);

    if (userToReceiveAnswer) {
        userToReceiveAnswer.conn.send(JSON.stringify({
            type: "answer_received",
            name: data.name,
            data: data.data.sdp
        }));
    }
}

const handleIceCandidate = (connection, data) => {
    const userToReceiveIceCandidate = findUser(data.target);

    if (userToReceiveIceCandidate) {
        userToReceiveIceCandidate.conn.send(JSON.stringify({
            type: "ice_candidate",
            name: data.name,
            data: {
                sdpMLineIndex: data.data.sdpMLineIndex,
                sdpMid: data.data.sdpMid,
                sdpCandidate: data.data.sdpCandidate
            }
        }));
    }
}
