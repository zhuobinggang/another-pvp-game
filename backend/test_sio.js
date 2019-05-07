var io = require('socket.io')(8000); 

const constants = {
  state: {
    BEFORE_CONNECT: 0,
    CONNECTED: 1,
    LOGINED: 2,
    READY_FOR_GAME: 3,
    BEFORE_GAME_COUNTDOWN: 4,
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

io.on('connection', function(socket){
  socket.storage = {logined: false};

  socket.on(constants.event.LOGIN, (userInfo, callback) => {
    console.log('On login:')
    if(userInfo.user == 'kobako'){
      callback({ret: constants.status.SUCCESS});
      socket.storage.logined = true;
    }else{
      callback({ret: constants.status.fAILED, err: 'Invalid user'});
      socket.storage.logined = false;
    }
  });

  socket.on(constants.event.READY, (callback) => {
    console.log('On ready:')
    callback({ret: constants.status.SUCCESS});
    socket.emit(constants.event.MATCHED, {ret: constants.status.SUCCESS});
  });

  
});

