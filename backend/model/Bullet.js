const SAT = require('sat');
const U = require('../common/utils');

class Bullet{

  constructor({
    srcId, type, radian, pos, speed, lifeSpan, srcType,
  }){
    this.srcId = srcId;
    this.type = type;
    this.radian = radian;
    this.pos = pos;
    this.speed = speed;
    this.srcType = srcType;

    this.lifeSpan = lifeSpan * 1000;
    this.lifeStartedAt = new Date().getTime(); 
  }

}

class BulletManager{
  constructor(updateInterval = 1000){
    this.AUTO_INC_ID = 0;
    this.bulletMap = {};
    this.bulletBodyMap = {}; // SAT.Circle

    this.updateCounter = 0;
    this.updateInterval = updateInterval;
  }


  spawn(parameterObject){
    const type = parameterObject.type;
    if(type == 'bullet1'){
      this.AUTO_INC_ID ++;
      this.bulletMap[this.AUTO_INC_ID] = new Bullet(parameterObject);
      this.bulletBodyMap[this.AUTO_INC_ID] = new SAT.Circle(
        new SAT.Vector(parameterObject.pos.x, parameterObject.pos.y),
        8,
      );
    }else if(type == 'slimeball'){
      this.AUTO_INC_ID ++;
      this.bulletMap[this.AUTO_INC_ID] = new Bullet(parameterObject);
      this.bulletBodyMap[this.AUTO_INC_ID] = new SAT.Circle(
        new SAT.Vector(parameterObject.pos.x, parameterObject.pos.y),
        15,
      );
    }else if(type == 'wood_sword'){
      this.AUTO_INC_ID ++;
      parameterObject.lifeSpan = 1; //近战武器只有1秒生命
      parameterObject.speed = 5;
      //设置pos为前方20px, 半径跟角色一样为16px
      parameterObject.pos = U.calTarPos(parameterObject.pos, parameterObject.radian, 20, 1000);
      this.bulletMap[this.AUTO_INC_ID] = new Bullet(parameterObject);
      this.bulletBodyMap[this.AUTO_INC_ID] = new SAT.Circle(
        new SAT.Vector(parameterObject.pos.x, parameterObject.pos.y),
        16,
      );
    }else if(type == 'iceshoot'){
      this.AUTO_INC_ID ++;
      this.bulletMap[this.AUTO_INC_ID] = new Bullet(parameterObject);
      this.bulletBodyMap[this.AUTO_INC_ID] = new SAT.Circle(
        new SAT.Vector(parameterObject.pos.x, parameterObject.pos.y),
        20,
      );
    }
    return parameterObject;
  }

  remove(id){
    delete this.bulletMap[id];
    delete this.bulletBodyMap[id];
  }

  canUpdate(elapsedTime){
    this.updateCounter += elapsedTime;
    if(this.updateCounter >= this.updateInterval){
      this.updateCounter = 0;
      return true;
    }else{
      return false;
    }
  }

  update(elapsedTime){
    const now = new Date().getTime();
    if(this.canUpdate(elapsedTime)){
      //移动并且根据生命周期移除子弹
      for(let id in this.bulletMap){
        const bullet = this.bulletMap[id];
        if(now - bullet.lifeStartedAt >= bullet.lifeSpan){ //删除
          delete this.bulletMap[id];
          delete this.bulletBodyMap[id];
        }else{ //移动
          const step = bullet.speed * (elapsedTime / 1000);
          const dx = step * Math.cos(bullet.radian);
          const dy = step * Math.sin(bullet.radian);
          bullet.pos.x += dx;
          bullet.pos.y += dy;

          this.bulletBodyMap[id].pos = bullet.pos;
        }
      }
    }
  }
  
}

module.exports = {Bullet, BulletManager};
