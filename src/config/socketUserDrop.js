const { verify } = require('jsonwebtoken');
const clientList = [];

// [{
//      socketId: "socketId",
//      type:"user/seller/deliveryBoy/admin",
//      platform:"web/app",
//      rooms: [room],
//      id:3,
//      name:"name"
// }]

exports.addSocketUser = async data => {
    try {
        const {
            userSocketId,
            type,
            platform,
            room,
            token,
            latitude,
            longitude,
        } = data;
        const user = clientList.find(user => user.socketId === userSocketId);
        if (user) {
            const index = clientList.findIndex(
                user => user.socketId === userSocketId
            );
            let rooms = user.rooms; // list of rooms
            // add new room of this user
            if (!rooms.includes(room)) {
                rooms.push(room);
            }

            const { id, name } = getIdFromToken(token, type);

            // update user
            clientList[index] = {
                ...user,
                rooms,
                id: id || null,
                name: name || null,
                token: token || null,
                latitude: latitude || null,
                longitude: longitude || null,
                location: latitude
                    ? {
                          type: 'Point',
                          coordinates: [longitude, latitude],
                      }
                    : null,
            };
        } else {
            try {
                const { id, name } = getIdFromToken(token, type);

                clientList.push({
                    id: id || null,
                    name: name || null,
                    socketId: userSocketId,
                    type,
                    platform,
                    rooms: [room],
                    token: token || null,
                    latitude: latitude || null,
                    longitude: longitude || null,
                    location: latitude
                        ? {
                              type: 'Point',
                              coordinates: [longitude, latitude],
                          }
                        : null,
                });

                const findUser = clientList.find(
                    user => user.userSocketId === userSocketId
                );

                return {
                    status: true,
                    message: 'success',
                    user: findUser,
                };
            } catch (error) {
                console.log(error);
            }
        }

        const findUser = clientList.find(
            user => user.userSocketId === userSocketId
        );

        return {
            status: true,
            message: 'success',
            user: findUser,
        };
    } catch (error) {
        return { status: true, error };
    }
};

exports.removeSocketUser = (socketId, cb, er) => {
    try {
        const index = clientList.findIndex(user => user.socketId === socketId);
        const user = clientList[index];
        if (index !== -1) {
            clientList.splice(index, 1)[0];
            cb(user);
        } else {
            er({
                message: 'user not found',
                status: false,
                error: 'user not found',
            });
        }
    } catch (error) {
        er(error);
    }
};

exports.removeUser = async socketId => {
    try {
        const index = clientList.findIndex(user => user.socketId === socketId);
        const user = clientList[index];

        if (index !== -1) {
            clientList.splice(index, 1)[0];
        } else {
            console.log('user not found');
        }
    } catch (error) {
        console.log(error);
    }
};

exports.getSingleUserInfoById = id => clientList.find(user => user.id === id);
exports.getSingleUserInfoBySocketId = socketId =>
    clientList.find(user => user.socketId === socketId);

const getIdFromToken = (t, type) => {
    try {
        let token = t;
        if (!token)
            return {
                id: null,
                name: null,
            };
        token = token.slice(7);

        let __secure_key = '';
        // user / deliveryBoy / admin / seller
        if (type == 'user') {
            __secure_key = process.env.JWT_PRIVATE_KEY_USER;
        } else if (type == 'deliveryBoy') {
            __secure_key = process.env.JWT_PRIVATE_KEY_DELIVERY_BOY;
        } else if (type == 'admin') {
            __secure_key = process.env.JWT_PRIVATE_KEY_ADMIN;
        } else if (type == 'seller') {
            __secure_key = process.env.JWT_PRIVATE_KEY_SELLER;
        }

        const { id, name } = verify(token, __secure_key);
        return { id, name };
    } catch (err) {
        return {};
    }
};

exports.getUserByType = type => clientList.filter(user => user.type === type);

exports.getUsersInRoom = room =>
    clientList.filter(user => user.rooms.includes(room));

exports.getAllUsers = async () => clientList;

exports.totalLiveUsers = () => clientList.length;
