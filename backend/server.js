var io = require('socket.io')(8000); 
const Identity = require('fake-identity');
const Game = require('./model/Game');

const constants = {
  state: {
    BEFORE_CONNECT: 0,
    CONNECTED: 1,
    LOGINED: 2,
    READY_FOR_GAME: 3,
    BEFORE_GAME_COUNTDOWN: 4,
    IN_GAME: 'IN_GAME',
  },
  status: {
    SUCCESS: 1000,
    fAILED: 1001,
  },
  event: {
    CONNECT: 'connect',
    MATCHED: 'matched',
    LOGIN: 'login',
    READY: 'ready',
  }
};

const rooms = {
  '0': {
    id: 0,
    state: 'HAVE_SEAT',
    seats: [],
    game: null, 
  }
};

let playerCount = 0;

function returnableRoomInfo(room){
  //const room = rooms[roomId];
  return {
    id: room.id,
    state: room.state,
    seats: room.seats,
  };
}

function leaveRoom(socket){
  const room = socket.storage.room;
  //console.log(socket.storage.room);

  if(room){
    const id = socket.storage.player.id;
    room.seats = room.seats.filter(player => {
      return player.id != id;
    });

    socket.to(room.id).emit('room', returnableRoomInfo(room));
    socket.leave(room.id);
    socket.storage.room = null;
  } 
}


function handleCommonRequest(socket){
  socket.on('player_info', (cb) => {
    console.log('Get player_info: ');
    cb({
      ret: 1000,
      data: socket.storage.player,
    })
  });


}

function handleReadyRoom(socket){

  socket.on('enter_room',(roomId, cb) => {
    console.log('Get enter_room: ' + roomId);
    socket.join(roomId);
    rooms[roomId].seats.push(socket.storage.player);
    socket.storage.room = rooms[roomId];
    socket.to(roomId).emit('room', returnableRoomInfo(rooms[roomId]));
    if(cb){
      cb({
        ret: 1000,
      });   
    }
  });

  socket.on('room_state', (cb) => {
    cb({
      ret: 1000,
      room_state: socket.storage.room.state,
    })
  });

  socket.on('room_info',  (cb) => {
    if(socket.storage.room != null){
      cb({
        ret: 1000,
        data: returnableRoomInfo(socket.storage.room),
      })
    }else{
      cb({
        ret: 1001,
        err: '用户没有进入任何房间'
      })
    }
  });

  socket.on('leave_room',  (cb) => {
    console.log('Get leave_room');
    leaveRoom(socket);
  });

  //玩家点击了开始游戏按钮
  socket.on('start_game',  () => {
    console.log('On start_game')

    //验证用户是否有开始游戏的权限
    const IAmRoomOwner = (() => {
      const room = socket.storage.room;
      const owner = room.seats[0];
      if(owner.id == socket.storage.player.id){
        return true;
      }else{
        return false;
      }
    })();
    if(IAmRoomOwner){

      //初始化游戏房间(room.game);
      socket.storage.room.game = new Game(
        socket.storage.room, 
        (msg, data) => { // Broadcast callback
          io.to(socket.storage.room.id).emit(msg, data);
        },
        () => { // On destroy callback
          console.log('房间清除回掉');
          socket.storage.room.game = null;
        },
      );
      socket.storage.room.state = 'IN_GAME';


      io.to(socket.storage.room.id).emit('enter_game', {
        started_at: new Date().getTime(),
      });
    }else{
      console.log('A non-room-owner player try to start game');
    }
  });
}

function handleInGame(socket){
  socket.on('game_ready', () => {
    if(socket.storage.room.game != null){
      socket.storage.room.game.ready(socket.storage.player.id);
      console.log(`socket with id : ${socket.id} loaded all resources`);
    }
  });
  socket.on('pos', (pos) => {
    if(socket.storage.room.game != null){
      socket.storage.room.game.playerMove(socket.storage.player.id, pos)
    }
  });
  socket.on('attack', ({type, radian, pos}) => {
    if(socket.storage.room.game != null){
      console.log('On attack:', type);

      //房间内也生成并管理一份bullet
      socket.storage.room.game.attack({
        srcId: socket.storage.player.id,
        type, radian, pos
      })
    }
  });
}

io.on('connection', function(socket){
  (() => { //Init storage
    const player = Identity.generate();
    playerCount++;
    player.id = playerCount;
    socket.storage = {
      player: player,
      state: constants.state.LOGINED,
      room: null, //Refer to rooms
    };
  })();

  //断线的时候要从房间里删掉它
  socket.on('disconnect',  () => {
    console.log('Get disconnect');
    leaveRoom(socket);
  });

  handleCommonRequest(socket);
  handleReadyRoom(socket);
  handleInGame(socket);
  
});


console.log('started');
