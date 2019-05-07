
function calRadian(srcPos, tarPos){
  const dx = tarPos.x - srcPos.x;
  const dy = tarPos.y - srcPos.y;
  const radian = (() => {
    const result = dx == 0 ? (Math.PI / 2) : Math.abs(Math.atan(dy / dx));
    if(dx >= 0){ //第2象限
      if(dy >= 0){
        return result;
      }else{ //1
        return -result;
      }
    }else{
      if(dy >= 0){ //3
        return Math.PI - result;
      }else{ //4
        return Math.PI + result;
      }
    }
  })();
  return radian;
}

function calTarPos(srcPos, radian, speed, elapsedTime){
  const d = speed * (elapsedTime / 1000);
  const dx = d * Math.cos(radian);
  const dy = d * Math.sin(radian);
  return {
    x: srcPos.x + dx,
    y: srcPos.y + dy,
  }
}

function distance(pos1, pos2){
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx*dx, dy*dy);
}



module.exports = {
  calRadian, calTarPos, distance
}
