const SAT = require('sat');
const Ticker = require('../ticker.js');
const {Bullet, BulletManager} = require('./Bullet');
const {MonsterManager} = require('./Monster');

const STATES = {
  INIT: 0,
  STARTED: 1,
  STOPED: 2,
}



class Game {
  constructor(room, broadCast, onDestroyCb){
    const me = this;
    me.room = room;
    me.broadCast = broadCast;
    me.world = {}; //All status of all things, e.g. positions of all units
    me.gameStartedAt = -1; 
    me.MAX_GAME_TIME = 1000 * 60; //最大游戏时间, TEST: 等待10秒看是否接收到game_end信息
    me.state = STATES.INIT; 

    me.playerMap = (() => {
      const result = {};
      room.seats.forEach(player => {
        player.ready = false;
        result[player.id] = player;
      });
      return result;
    })();

    me.destroyCallbacks = [onDestroyCb];

    me._tickerInterval = 1000;
    me.ticker = new Ticker(me._tickerInterval);


    me.bulletManager = new BulletManager();
    me.monsterManager = new MonsterManager();

    me.collidableWorld = {
      playerMap: {},
      bulletMap: me.bulletManager.bulletBodyMap, //引用bulletManager.bulletBodyMap
      monsterMap: me.monsterManager.monsterBodyMap, //引用
    };

    console.log('Init room.game');
  }

  ready(playerId){
    const me = this;
    console.log(`player with id ${playerId} is ready`);
    me.playerMap[playerId].ready = true;

    //check if can start game
    const canStartGame = (() => {
      let ok = true;
      for(let id in me.playerMap){
        if(!me.playerMap[id].ready){
          ok = false;
          break;
        }
      }
      return ok;
    })();
    debugger;
    if(canStartGame){
      console.log('Now can start game');
      me.startGame();
    }else{
      console.log('Now can not start game');
    }
  }

  returnableWorld(){
    return this.world;
  }

  returnablePosFromWorld(){
    const me = this;
    const world = me.world;
    const result = {playerMap: {}};

    for(let id in world.playerMap){
      const player = world.playerMap[id];
      result.playerMap[id] = player.pos;
    }

    return result;
    /** will be:
     *  {
     *    playerMap: {
     *      id1: {x, y},
     *      id2: {x, y},
     *    }
     *  }
     */
  }
  

  startGame(){
    console.log('GAME START!');

    const me = this;
    me.gameStartedAt = new Date().getTime();
    me.state = STATES.STARTED;

    //Init my world
    me.world.playerMap = (() => {
      const result = {};
      let count = 0;
      for(let playerId in me.playerMap){
        count ++;
        const player = me.playerMap[playerId];
        result[playerId] = {
          pos: {
            x: 100 * count,
            y: 50,
          },
          //score: Math.floor(Math.random() * 100),
          hp: 100,
        };
      }
      return result;
    })();
    me.world.monsterMap = me.monsterManager.initMap();
    me.world.bulletMap = me.bulletManager.bulletMap;

    //为玩家创建碰撞检测框
    //NOTE: 在玩家移动的时候要同时移动碰撞框
    for(let id in me.world.playerMap){
      const player = me.world.playerMap[id];
      me.collidableWorld.playerMap[id] = new SAT.Circle(
        new SAT.Vector(player.pos.x, player.pos.y), 
        16,
      );
    }


    //Broadcast my world
    me.broadCast('start_game', {
      world: me.returnableWorld(),
      countdown: me.MAX_GAME_TIME,
    });

    me.ticker.add(me.gameLoop.bind(me)).start();
  }

  playerMove(id, pos){
    //console.log('Playermove, id: ', id);
    const me = this;
    if(me.state != STATES.STARTED){
      console.log('并非处于游戏中状态，无法playerMove(), 现在状态:' + me.state);
    }else{
      const player = me.world.playerMap[id];
      if(player == null){
      
      }else{
        //NOTE: 广播玩家位置信息会在游戏循环里做
        player.pos = pos;

        //移动碰撞框
        me.collidableWorld.playerMap[id].pos = pos;
      }
    }
  }

  attack({srcId, type, radian, pos, srcType = 'player', speed = 20}){
    const me = this;
    if(me.state != STATES.STARTED){
      console.log('并非处于游戏中状态，无法发送攻击信息, 现在状态:' + me.state);
    }else{
      const me = this;

      const bulletConf = {
        srcId, type, radian, pos, 
        speed: speed, // pixels per second
        lifeSpan: 4, // seconds
        srcType,
      };

      //生成并维护bullet
      const updatedBulletConf = me.bulletManager.spawn(bulletConf);

      me.broadCast('attack', updatedBulletConf);
    }
  }


  onDestroy(){
    const me = this;
    console.log('On game destroy');
    me.ticker.stop();
    me.destroyCallbacks.forEach(cb => {
      cb();
    })
  }

  getCoundownTime(){
    const me = this;
    const now = new Date().getTime();
    return me.MAX_GAME_TIME - (now - me.gameStartedAt);
  }


  gameLoop(){
    const me = this;
    const now = new Date().getTime();
    if(now - me.gameStartedAt > me.MAX_GAME_TIME || me.monsterManager.isBossKilled()){
      console.log('GAME OVER');
      me.room.state = 'LEISURE';
      me.broadCast('game_over', {
        world: me.returnableWorld(),
        monsterRecord: me.monsterManager.getRecord(),
      });
      me.state = STATES.STOPED;
      me.onDestroy();
    }else{
      me.broadCast('all_pos', me.returnablePosFromWorld());

      me.bulletManager.update(me._tickerInterval);

      //Start 碰撞检测
      for(let bulletId in me.collidableWorld.bulletMap){
        const bulletBody = me.collidableWorld.bulletMap[bulletId];

        //检测子弹跟玩家碰撞
        for(let playerId in me.collidableWorld.playerMap){
          const player = me.world.playerMap[playerId];
          if(player.dead == true){
            continue;
          }
          const playerBody = me.collidableWorld.playerMap[playerId];
          const collided = SAT.testCircleCircle(playerBody, bulletBody);
          if(collided){
            const bullet = me.bulletManager.bulletMap[bulletId];
            if(bullet.type == 'bullet1' || bullet.type == 'slimeball' || bullet.type =='wood_sword' || bullet.type == 'iceshoot'){
              //如果是自己发射的就不扣血
              if(bullet.srcType == 'player' && bullet.srcId == playerId){
              
              }else{
                //扣10血不销毁bullet
                if(bullet.type == 'wood_sword'){
                  console.log('wood_sword collide player');
                  player.hp -= 20;
                }else if(bullet.type == 'iceshoot'){
                  console.log('iceshoot collide player');
                  player.hp -= 15;
                }else{
                  player.hp -= 10;
                }
                //me.bulletManager.remove(bulletId);
                me.broadCast('hp_change_player', { tarId: playerId, hp: player.hp, });

                //If player dead
                if(player.hp <= 0){
                  player.dead = true;
                }
              }
            }
          }
        }

        //检测子弹和怪物碰撞
        for(let monsterId in me.collidableWorld.monsterMap){
          const monsterBody = me.collidableWorld.monsterMap[monsterId];
          const collided = SAT.testCircleCircle(bulletBody, monsterBody);
  
          if(collided){
            const bullet = me.bulletManager.bulletMap[bulletId];
            const monster = me.monsterManager.monsterMap[monsterId];
            me.monsterManager.bulletMonsterCollide(bullet, monster, me.broadCast.bind(me));
          }
        }

      } 
      // End 碰撞检测

      // 怪物AI
      const events = me.monsterManager.updateThenGetEvents(me._tickerInterval, me.world.playerMap, me.attack.bind(me));
      events.forEach(e => {
        me.broadCast(e.name, e.data);
      });
    }
  }
}


module.exports = Game
