import connection from '../config/connectDB';
require('dotenv').config();

const sendtoDL = async (io) => {
    var [listDL] = await connection.query('SELECT `id_user` FROM users WHERE level = ? AND veri = 1 ', [2]);
    io.on('connection', (socket) => {
        if(listDL.length > 0){
            for (let i = 0; i < listDL.length; i++) {
                let phone = listDL[i].id_user;
                //console.log(phone)
                socket.on(phone , (msg) => {
                    if(msg){
                        console.log(msg);
                    io.emit(phone , msg);
                    }
                });
                
            }
        }
        
        
    });
}
const sendMessageAdmin = (io) => {
    io.on('connection', (socket) => {
        socket.on('data-server', (msg) => {
            io.emit('data-server', msg);
        });
        socket.on('data-server_2', (msg) => {
            io.emit('data-server_2', msg);
        });
        socket.on('data-server-5', (msg) => {
            io.emit('data-server-5', msg);
        });
        socket.on('data-server-3', (msg) => {
            io.emit('data-server-3', msg);
        });
        
    });
} 
module.exports = {
    sendMessageAdmin,
    sendtoDL,
}