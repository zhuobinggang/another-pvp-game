
PIXI.loader.safeAdd = (path) => {
  if(PIXI.loader.resources[path] != null){
    return PIXI.loader
  }else{
    return PIXI.loader.add(path)
  }
}


function emit(eventName, data, callback){
  if(window.socket == null){
    console.warn(`Now the socket is null! Cannot send event named ${eventName}`);
  }else if(socket.disconnected){
    console.warn(`Now the socket is disconnected! Cannot send event named ${eventName}`);
  }else{
    socket.emit(eventName, data, callback);
  }
}

function receive(eventName, callback){
  if(window.socket == null){
    console.warn(`Now the socket is null! Cannot listen event named ${eventName}`);
  }else if(socket.disconnected){
    console.warn(`Now the socket is disconnected! Cannot send event named ${eventName}`);
  }else{
    socket.on(eventName, callback);
  }
}


function calTarPos(srcPos, radian, speed, elapsedTime){
  //const d = speed * (elapsedTime / 1000);
  const d = speed * elapsedTime;
  const dx = d * Math.cos(radian);
  const dy = d * Math.sin(radian);
  return {
    x: srcPos.x + dx,
    y: srcPos.y + dy,
  }
}
