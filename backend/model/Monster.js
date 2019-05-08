const SAT = require('sat');
const U = require('../common/utils');

const MONSTER_STATES = {
  MOVING: 2,
  LEISURE: 1,
}

const CirnoConfig = {
  hp: 300,
  collideRadius: 16,
  speed: 50,
}

class Monster{
  constructor(id, type, pos, hp, manager, speed = 30){
    this.type = type;
    this.pos = pos;
    this.hp = hp;
    this.id = id;
    this.dead = false;

    this.manager = manager;

    //AI
    this.lastDecideAt = -1;
    this.decideCooldownTime = 2000;
    this.speed = speed; //pixels/second
    this.radian = 0;
    this.state = MONSTER_STATES.LEISURE;

    this.spawnedAt = new Date().getTime();
    this.playingAnimation = true;
    //出生动画时间, boss之类的要用
    if(type == 'cirno'){
      this.spawnAnimationTime = 3000; //三秒
    }else{
      this.spawnAnimationTime = 0;
    }
  }

  returnable(){
    return {
      id: this.id,
      type: this.type,
      pos: this.pos,
      hp: this.hp,
    }
  }

  nearestPlayer(playerMap){
    let minDist = 99999;
    let result = null;
    for(let id in playerMap){
      const player = playerMap[id];
      if(player.dead == true){
        continue;
      }
      const d = U.distance(player.pos, this.pos);
      if(d < minDist){
        minDist = d;
        result = player;
      }
    }
    return result;
  }

  updateSandworm(elapsedTime, now, playerMap, attack){
    const events = [];

    if(this.state == MONSTER_STATES.MOVING){
      const tarPos = U.calTarPos(this.pos, this.radian, this.speed, elapsedTime);
      this.manager.moveTo(this.id, tarPos);
    }

    if(now - this.lastDecideAt >= this.decideCooldownTime){
      this.lastDecideAt = now;
      const nearestPlayer = this.nearestPlayer(playerMap);
      if(nearestPlayer == null){
        //Do nothing
      }else{
        const radian = U.calRadian(this.pos, nearestPlayer.pos);
  
        //如果太近，就直接发射子弹
        const distance = U.distance(nearestPlayer.pos, this.pos);
        if(distance < 20){
          const stopEvent = this.emitBulletMaybeStop('slimeball', 60, radian, attack);
          if(stopEvent != null){
            events.push(stopEvent);
          }
        }else{
          const rand = Math.random() * 100;
          if(rand < 60){//移动
            const moveEvent = this.move(radian);
            events.push(moveEvent);
          }else{//发射子弹
            const stopEvent = this.emitBulletMaybeStop('slimeball', 60, radian, attack);
            if(stopEvent != null){
              events.push(stopEvent);
            }
          }
        }
      }


    }
    return events;
  }

  move(radian){
    this.state = MONSTER_STATES.MOVING;
    this.radian = radian;
    const resultEvent = {
      name: 'monster_move',
      data: {
        id: this.id,
        radian: radian, //这里为空
        speed: this.speed,
        pos: this.pos,
      },
    };
    // 设定自己的radian, 并产生一个移动事件
    return resultEvent;
  }

  emitBulletMaybeStop(type, speed, radian, attack){
    // 生成一个子弹并产生一个子弹事件
    attack({
      srcId: this.id, 
      type: type, 
      radian: radian,
      pos: {
        x: this.pos.x, 
        y: this.pos.y
      },
      srcType: 'monster',
      speed: speed,
    }); 

    if(this.state == MONSTER_STATES.MOVING){
      this.state = MONSTER_STATES.LEISURE;
      //如果正在移动就发送一个STOP事件
      //产生一个Stop事件，让前端可以将怪物停下来
      return {
        name: 'monster_stop',
        data: {
          id: this.id,
          pos: this.pos, 
        }
      }
    }else{
      return null;
    }
  }

  updateCirno(elapsedTime, now, playerMap, attack){
    //更新boss行为
    const events = [];

    if(this.state == MONSTER_STATES.MOVING){
      const tarPos = U.calTarPos(this.pos, this.radian, this.speed, elapsedTime);
      this.manager.moveTo(this.id, tarPos);
    }

    if(now - this.lastDecideAt >= this.decideCooldownTime){
      this.lastDecideAt = now;

      const nearestPlayer = this.nearestPlayer(playerMap);
      const radian = U.calRadian(this.pos, nearestPlayer.pos);
      const distance = U.distance(nearestPlayer.pos, this.pos);

      //console.log('Nearest Distance: ',distance);

      //AOE, 单体攻击，移动

      if(distance < 20){ //单体攻击
        const stopEvent = this.emitBulletMaybeStop('iceshoot',70, radian, attack);
        if(stopEvent != null){
          events.push(stopEvent);
        }
      }else{
        const rand = Math.random() * 100;
        if(rand < 50){ //移动
          const moveEvent = this.move(radian);
          events.push(moveEvent);
        }else if(rand < 75){ //单体攻击
          //this.emitBulletMaybeStop('iceshoot',70, radian, attack, );
          const stopEvent = this.emitBulletMaybeStop('iceshoot',70, radian, attack);
          if(stopEvent != null){
            events.push(stopEvent);
          }
        }else{ //AOE
          //TODO: 进行AOE攻击
          //this.emitBulletMaybeStop('iceshoot',70, radian, attack);
          const stopEvent = this.emitBulletMaybeStop('iceshoot',70, radian, attack);
          if(stopEvent != null){
            events.push(stopEvent);
          }
        }
      }
    }
    return events;
  }

  updateThenGetEvents(elapsedTime, now, playerMap, attack){
    if(this.playingAnimation){
      if(now - this.spawnedAt > this.spawnAnimationTime){
        this.playingAnimation = false;
        console.log('Monster ', this.id, ' animation over, ready for update!');
      }
    }

    if(this.playingAnimation){
      //Do nothing
      return [];
    }else{
      if(this.type == 'sandworm'){
        return this.updateSandworm(elapsedTime, now, playerMap, attack);
      }else if(this.type == 'cirno'){
        return this.updateCirno(elapsedTime, now, playerMap, attack);
      }
    }
  }
}




class MonsterManager{
  constructor(){
    this.monsterMap = {};
    this.monsterBodyMap = {};
    this.record = { //记录器
      damage: [],
      kill: [], 
    };
    this.AUTO_INC_ID = 0;

    this.phase = 1;
  }

  spawn(type){
    if(type == 'sandworm'){
      this.AUTO_INC_ID++;
      const monster = new Monster(this.AUTO_INC_ID, 'sandworm', {
        x: 20 + Math.random() * 300,
        y: 20 + Math.random() * 300,
      }, 100, this);

      this.monsterMap[this.AUTO_INC_ID] = monster;
      this.monsterBodyMap[this.AUTO_INC_ID] = new SAT.Circle(
        new SAT.Vector(monster.pos.x, monster.pos.y),
        32,
      );

      return monster;
    }else if(type == 'cirno'){
      this.AUTO_INC_ID++;
      const monster = new Monster(this.AUTO_INC_ID, 'cirno', {
        x: 20 + Math.random() * 300,
        y: 20 + Math.random() * 300,
      }, CirnoConfig.hp, this, CirnoConfig.speed);

      this.monsterMap[this.AUTO_INC_ID] = monster;
      this.monsterBodyMap[this.AUTO_INC_ID] = new SAT.Circle(
        new SAT.Vector(monster.pos.x, monster.pos.y),
        CirnoConfig.collideRadius,
      );
      return monster;
    }
  }

  // Auxiliary function to be delete
  initMap(){
    this.spawn('sandworm');
    this.spawn('sandworm');
    return this.returnableMonsterMap();
  }

  returnableMonsterMap(){
    const result = {};
    for(let id in this.monsterMap){
      result[id] = this.monsterMap[id].returnable();
    }
    return result;
  }

  updateThenGetEvents(elapsedTime, playerMap, attack){
    const events = [];
    const now = new Date().getTime();
    for(let id in this.monsterMap){
      const monster = this.monsterMap[id];
      const eves = monster.updateThenGetEvents(elapsedTime, now, playerMap, attack);
      eves.forEach(e => {
        events.push(e);
      })
    }
    return events;
  }

  moveTo(id, tarPos){
    if(this.monsterMap[id] == null){
      console.log('Wrong monster');
    }else{
      this.monsterMap[id].pos = tarPos;
      this.monsterBodyMap[id].pos = tarPos;
    }
  }

  bulletMonsterCollide(bullet, monster, broadCast){
    if(monster.dead == true){
      return
    }else{
      if(bullet.type == 'bullet1' || bullet.type == 'slimeball' || bullet.type == 'wood_sword' || bullet.type == 'iceshoot'){
        if(bullet.srcType == 'monster' && bullet.srcId == monster.id){
          //判断如果是该怪物
          //不受伤害
        }else{
          //console.log('Monster hp decrease');
          const damage = (() => {
            if(bullet.type == 'wood_sword'){
              return 20;
            }else if(bullet.type == 'iceshoot'){
              return 15;
            }else{
              return 10;
            }
          })();
          monster.hp -= damage;
          broadCast('hp_change_monster', { tarId: monster.id, hp: monster.hp, });
  
  
          this.recordDamage(damage, monster.id, bullet);
  
          if(monster.hp <= 0){
            monster.dead = true;
            //从map里面删掉, 然后记录杀死名单
            delete this.monsterMap[monster.id];
            delete this.monsterBodyMap[monster.id];
            this.recordKill(monster.id, bullet);

            //每当一个怪物死亡，检测是否达到解锁下一阶段的条件
            this.checkSwitchPhase(broadCast);
          }
        }
      }else{
        console.warn('Unknown bullet type, do nothing');
      }
    }
  }

  //记录是谁杀死怪物
  recordKill(monsterId, bullet){
     this.record.kill.push({
      monsterId,
      srcType: bullet.srcType,
      srcId: bullet.srcId,
    });
  }

  recordDamage(damage, monsterId, bullet){
    this.record.damage.push({
      damage,
      monsterId,
      bulletType: bullet.type,
      srcType: bullet.srcType,
      srcId: bullet.srcId,
    });
  }

  getRecord(){
    return this.record;
  }

  isBossKilled(){
    return false;
  }

  checkSwitchPhase(broadCast){
    if(this.phase == 1){
      if(this.record.kill.length >= 2){
        console.log('Switch to phase 2, spawn Cirno');
        this.phase = 2;
        //生成boss
        const monster = this.spawn('cirno'); //琪露诺
        broadCast('spawn_monster', monster.returnable());
      }
    }else{

    }
  }

}

module.exports = {MonsterManager}
