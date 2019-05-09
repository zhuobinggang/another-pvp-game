function circleTexture(size = 10, color){
  const g = new PIXI.Graphics();
  g.lineStyle(0);
  g.beginFill(color);
  g.drawCircle(0,0,size);
  g.endFill();
  return g.generateCanvasTexture();
}

function drawWorld(g, world){
  //console.log('here')
  let body = world.getBodyList()
  g.clear()

  g.lineStyle(2, 0xFFFFFF);
  //g.beginFill(0x3500FA, 1)
  while(body != null){
    const pos = body.getPosition()
    let fixt = body.getFixtureList()

    while(fixt != null){
      const shape = fixt.getShape()
  
      if(shape.getType() == 'polygon'){
        //console.log('yes')
        const path = []
        shape.m_vertices.forEach(v => {
          path.push(pos.x + v.x)
          path.push(pos.y + v.y)
        })
        g.drawPolygon(path)
      }   
      fixt = fixt.getNext()
    }


    body = body.getNext()
  }
  g.endFill()
}

//根据一些可变配置信息来重新生成精灵和图层等
function reGenerateWorldFromVariableData(scene){
  return loadTiledMap('assets/multi-player-map.json')
    .then(tmx => {
      scene.tmx = tmx;
      const container = tmxToContainer(tmx);
      app.stage.addChild(container);
      scene.container = container;
      return null;
    })
}

function loadMultiGameScene(){
  let inited = false;
  const scene = {
    name: 'multiGame',
    container: null,
    sortableContainer: null, //Should init before other visible things
    selfPlayerInfo: null,
    player: null,  //一个有storage属性的sprite NOTE: 结束后将位置设置到100,100, 并且冻结
    playerMap: {},  //根据服务器下发的信息修正，但是会在本地产生变化, 含有sprite属性 NOTE: 结束后将所有player destroy并将这个设为null
    monsterMap: {},  //根据服务器下发的信息修正，但是会在本地产生变化, 含有sprite属性 NOTE: 结束后将所有player destroy并将这个设为null
    sendPosLoop: null, //在ticker里循环发送自己的位置，游戏结束后清除
    camera: null, //
    gameResetCallbacks: [], //会一直保留, 比如玩家冻结并初始化位置等
    gameResetCallbacksOnce: [], //遍历一次后清空, 如其他玩家的信息删除
    ortherPlayersNode: [], //用于重置游戏后删除
    bulletContainer: null,
    joystick: null,
    attackBtn: null,
    ticker: null,
    logger: null,
    tmx: null,
    world: null, //box2d world
    enter: (selfPlayerInfo) => {
      scene.selfPlayerInfo = selfPlayerInfo;
      console.log('set scene.selfPlayerInfo');
      console.log(scene.selfPlayerInfo);

      window.scene = scene;
      if(!inited){
        inited = true;
        return reGenerateWorldFromVariableData(scene) //第二次进的时候不需要再加载
          .then(() => {
            scene.sortableContainer = new PIXI.Container();
            scene.container.addChild(scene.sortableContainer);
            scene.bulletContainer = new PIXI.Container();
            scene.container.addChild(scene.bulletContainer);

            scene.gameResetCallbacks.push(() => {
              console.log('++++++++');
              console.log(scene.bulletContainer);
              console.log('++++++++');
              scene.bulletContainer.children.forEach(b => {
                console.log('destroy b');
                //b.destoy();
                b.destroyWithTikcer()
              });
            });
          })
          .then(() => {
            return scene.loadTextures();
          })
          .then(() => { //init camera
            const camera = {
              x: screen.width / 2, 
              y: window.getScreenHeight() / 2,
              container: new PIXI.Container(),
              moveTo: (x, y) => {

                (() => {
                  const HFW = screen.width / 2
                  const HFH = window.getScreenHeight() / 2
                  x = Math.max(HFW, x)
                  y = Math.max(HFH, y)
                  const b = scene.container.getBounds()
                  x = Math.min(b.width - HFW, x)
                  y = Math.min(b.height - HFH, y)
                })();

                const dx = x - camera.x;
                const dy = y - camera.y;
                camera.x = x;
                camera.y = y;
                scene.container.x -= dx;
                scene.container.y -= dy;

                const containerPos = camera.container.position
                camera.container.position.set(containerPos.x + dx,containerPos.y + dy);
              },
              tranfer: (x, y) => {
                camera.moveTo(camera.x + x, camera.y + y);
              },
            }

            scene.camera = camera;
          })
          .then(() => { //Init ticker 
            if(scene.ticker == null){
              const ticker = new PIXI.ticker.Ticker();
              scene.ticker = ticker;
            }
          })
          .then(() => { //init joystick
            //scene.camera.container.addChild(g);
            window.camera = scene.camera;

            const joystick = {
              x: 60,
              y: window.getScreenHeight() - 40,
              //radian: 0,
              offX: 0, // Where is hhe frontCircle 
              offY: 0,
              radiusFront: 15,
              radiusBack: 30,
              pointerDownOnMe: false,
            }

            const backCircle = new PIXI.Sprite(circleTexture(joystick.radiusBack, 0x8B8B83));
            backCircle.anchor.set(0.5);
            const frontCircle = new PIXI.Sprite(circleTexture(joystick.radiusFront, 0x71C671));
            frontCircle.anchor.set(0.5);



            backCircle.position.set(joystick.x, joystick.y);
            frontCircle.position.set(joystick.x, joystick.y);



            scene.camera.container.addChild(backCircle);
            scene.camera.container.addChild(frontCircle);



            //When point down, listen 
            window.frontCircle = frontCircle;

            frontCircle.interactive = true;
            frontCircle.on('pointermove', ({data: {global: {x, y}}}) => {
              if(joystick.pointerDownOnMe){
                const dx = x - joystick.x;
                const dy = y - joystick.y;
                //frontCircle.position.set(x, y);
  
                let distance = Math.sqrt((dx * dx) + (dy * dy));
                distance = Math.min(distance, joystick.radiusBack);
  
                //joystick.distance = Math.min(distance, joystick.radiusBack);
  
                //console.log(joystick.distance);
  
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

                let offX = distance * Math.cos(radian);
                let offY = distance * Math.sin(radian);

                joystick.offX = offX;
                joystick.offY = offY;
                //console.log(theX, theY);
                frontCircle.position.set(joystick.x+offX, joystick.y+offY);

                //Add for attck
                scene.player.storage.radian = radian;
              }
            })
            frontCircle.on('pointerdown', ({data: {global: {x, y}}}) => {
              joystick.pointerDownOnMe = true;
            })
            function release(){
              frontCircle.position.set(joystick.x, joystick.y);
              joystick.offX = 0;
              joystick.offY = 0;
              joystick.pointerDownOnMe = false;
            }
            frontCircle.on('pointerup', (e) => {
              //console.log('pointerup');
              release(e);
            })
            frontCircle.on('pointerupoutside', (e) => {
              //console.log('pointerupoutside');
              release(e);
            })
            
            scene.joystick = joystick;


            //Joystick controller
            /*
            (() => {
              scene.ticker.add((t) => {
                if(joystick.offX != 0 || joystick.offX != 0){
                  const rate = 0.1;
                  scene.camera.tranfer(joystick.offX * rate, joystick.offY * rate);
                }
              });           
            })();
            */
          })
          .then(() => { //初始化攻击按钮
            //1. 监听点击事件，向服务器发送attact指令
            //2. 监听到广播的ws事件(attack), 再做渲染

            return new Promise((resolve, reject) => {
              PIXI.loader
                .safeAdd('assets/attack_button.png')
                .safeAdd('assets/bullet1.png')
                .load(() => {
                //mark
                ((G, btnTexture, bullet1Texture) => {

                  const cooldownConf = {
                    attackedAt: -1,
                    cooldownTime: scene.getCooldownTimeByWeapon(),
                    canAttack: true, // 简单的状态模式，只有可攻击和不可攻击两种状态
                    switchCanAttackStateCallbacks: [],
                    switchCanAttackState: () => {
                      cooldownConf.canAttack = true;
                      cooldownConf.switchCanAttackStateCallbacks.forEach((cb) => {
                        cb();
                      });
                    },
                    switchCantAttackState: () => {
                      cooldownConf.attackedAt = new Date().getTime();
                      cooldownConf.canAttack = false;
                      //每次攻击后根据武器类型改变冷却时间
                      cooldownConf.cooldownTime = scene.getCooldownTimeByWeapon();
                    }
                  }

                  const attackBtnPos = {
                    x: 500, y: window.getScreenHeight() - 40,
                  }


                  //增加冷却条
                  const cooldownCircle = new PIXI.Graphics();
                  //cooldownCircle.beginFill(0x00ff00);
                  cooldownCircle.lineStyle(6, 0x00ff00);
                  cooldownCircle.arc(attackBtnPos.x, attackBtnPos.y, 30, 0, 2*Math.PI);
                  G.camera.container.addChild(cooldownCircle);
                  G.ticker.add(() => {
                    if(cooldownConf.canAttack){
                    
                    }else{
                      const endRadian = (() => {
                        const now = new Date().getTime();
                        const elapsed = now - cooldownConf.attackedAt;
                        if(elapsed >= cooldownConf.cooldownTime){
                          //激活按钮并且转到可攻击状态
                          cooldownConf.switchCanAttackState();
                          return 2 * Math.PI;
                        }else{
                          const percent = elapsed / cooldownConf.cooldownTime;
                          return 2 * Math.PI * percent;
                        }
                      })();
                      cooldownCircle.clear();
                      //cooldownCircle.beginFill(0x00ff00);
                      cooldownCircle.lineStyle(6, 0x00ff00);
                      cooldownCircle.arc(attackBtnPos.x, attackBtnPos.y, 30, 0, endRadian);
                    }
                  });
                  //增加冷却条 end

                  const attackBtn = new PIXI.Sprite(btnTexture);
                  G.camera.container.addChild(attackBtn);
                  G.attackBtn = attackBtn;
                  attackBtn.width = 60;
                  attackBtn.height = 60;
                  attackBtn.position.set(attackBtnPos.x, attackBtnPos.y);
                  attackBtn.anchor.set(0.5);

                  addButtonComponent(attackBtn);

                  attackBtn.addPointDownListner(() => {
                    console.log('Attack  btn down!');
                    if(cooldownConf.canAttack && scene.player.storage.state != 'frozen'){
                      emit('attack', {
                        type: localStorage.getItem('weapon'),
                        //type: 'slimeball',
                        radian: G.player.storage.radian,
                        pos: {
                          x: G.player.x,
                          y: G.player.y,
                        },
                      });
                      cooldownConf.switchCantAttackState();
                      attackBtn.interactive = false;
                    }
                  });
                  //从冷却状态回复
                  cooldownConf.switchCanAttackStateCallbacks.push(() => {
                    attackBtn.interactive = true;
                  });

                  receive('attack', (originData) => {
                    const {srcId, type, radian, pos, speed, lifeSpan} = originData;
                    if(type == 'bullet1'){
                      const bullet = new PIXI.Sprite(bullet1Texture.clone());
                      bullet.width = 30;
                      bullet.height = 10;
                      bullet.position.set(pos.x, pos.y);
                      bullet.anchor.set(0.5);
                      bullet.rotation = radian;
                      scene.bulletContainer.addChild(bullet);

                      scene.addBulletLifeComponent(bullet, originData);

                    }else if(type == 'slimeball'){
                      const bullet = new PIXI.Sprite(PIXI.loader.resources['assets/slimeball.png'].texture.clone());
                      bullet.width = 30;
                      bullet.height = 30;
                      bullet.position.set(pos.x, pos.y);
                      bullet.anchor.set(0.5);
                      bullet.rotation = radian;
                      scene.bulletContainer.addChild(bullet);

                      scene.addBulletLifeComponent(bullet, originData);

                    }else if(type == 'wood_sword'){
                      const bullet = new PIXI.Sprite(PIXI.loader.resources['assets/sword_light1.png'].texture.clone());
                      bullet.width = 60;
                      bullet.height = 60;
                      bullet.position.set(pos.x, pos.y);
                      bullet.anchor.set(0.5);
                      bullet.rotation = radian;
                      scene.bulletContainer.addChild(bullet);

                      scene.addBulletLifeComponent(bullet, originData);
                    }else if(type == 'iceshoot'){
                      const bullet = new PIXI.Sprite(PIXI.loader.resources['assets/iceshoot.png'].texture.clone());
                      bullet.width = 50;
                      bullet.height = 20;
                      bullet.position.set(pos.x, pos.y);
                      bullet.anchor.set(0.5);
                      bullet.rotation = radian;
                      scene.bulletContainer.addChild(bullet);

                      scene.addBulletLifeComponent(bullet, originData);
                    }
                  })
    
                  resolve(null);
                })(
                  scene, 
                  PIXI.loader.resources['assets/attack_button.png'].texture,
                  PIXI.loader.resources['assets/bullet1.png'].texture
                ); 
              })
            });


          })
          .then(() => { //解析tmx，初始化碰撞框

            if(null == window.planck){
              alert("必须引入planck.js用于初始化物理世界")
            }else{
              const pl = planck
              const world = pl.World()
              scene.world = world

              const tmx = scene.tmx
              const tsx = tmx.tilesets[0]
              tsx.tileProperty = (tid) => {
                return tsx.tiles.find(tile => {
                  return tile.id == tid
                })
              }

              tmx.layers.forEach(layer => {
                if(layer.name == 'hugeObj'){
                  layer.tiles.forEach(tile => {
                    if(tile.id == 0){
                      return
                    }
                    property = tsx.tileProperty(tile.id)
                    if(property == null){
                      //console.warn(tile)
                      return
                    }
                    if(property.objectgroup != null){
                      property.objectgroup.objects.forEach(obj => {
                        if(obj.properties == null){
                          return
                        }

                        obj.properties.forEach(p => {
                          if(p.value == 'barrier'){ //不能够进入的碰撞框，初始化静态body
                            const sprite = tile.sprite
                            const body = world.createBody({
                              position: pl.Vec2(sprite.x, sprite.y),
                              userData: {
                                type: 'barrier',
                                sprite: sprite,
                              },
                            })
                            const vertice = obj.polyline.map(pos => {
                              return {x: pos.x + obj.x - sprite.width / 2, y: pos.y + obj.y - sprite.height / 2};
                            })
  
                            /*
                            const hw = sprite.width / 2
                            const hh = sprite.height / 2
                            const vertice = [
                              {x: -hw, y: -hh},
                              {x: hw, y: -hh},
                              {x: -hw, y: hh},
                              {x: hw, y: hh},
                            ]
                            */
  
                            //console.log(vertice, obj.x, obj.y)
                            body.createFixture(pl.Polygon(vertice), {
                              filterCategoryBits : 1,
                              filterMaskBits : 2,
                            })

                          }else if(p.value == 'shade'){
                            const sprite = tile.sprite
                            const body = world.createBody({
                              position: pl.Vec2(sprite.x, sprite.y),
                              userData: {
                                type: 'shade',
                                sprite : sprite,
                              },
                            })
                            const vertice = obj.polyline.map(pos => {
                              return {x: pos.x + obj.x - sprite.width / 2, y: pos.y + obj.y - sprite.height / 2};
                            })
 
                            //console.log(vertice, obj.x, obj.y)
                            body.createFixture(pl.Polygon(vertice), {
                              filterCategoryBits : 1,
                              filterMaskBits : 2,
                            })
                          }                       
                          
                        })
                        
                      })
                    }
                  })
                }
              })
            }

          })
          .then(() => { //Init self player

            return animes.marisa.spawn()
              .then((sprite) => {//Init animation

                const resetPlayer = () => {
                  scene.player = sprite;
                  scene.player.play(0,'right');
                  scene.player.storage = {
                    state: 'frozen', 
                  }
  
                  //一开始设置不可见，等待后端初始化信息下来才能解除
                  scene.player.visible = false;
                  scene.player.alpha = 1;
                }
                scene.gameResetCallbacks.push(resetPlayer);

                resetPlayer();

                scene.ticker.add(sprite.play);
                scene.sortableContainer.addChild(sprite);

                //scene.camera.moveTo(sprite.x, sprite.y);
                return sprite;
              })
              .then((sprite) => {//Init player collider
                const world = scene.world
                const pl = planck
                //console.log('Init barrier for: ', tile.id)
                const body = world.createDynamicBody({
                  position: pl.Vec2(sprite.x, sprite.y),
                  userData: {
                    type: 'player',
                    sprite: sprite,
                  },
                })


                const hw = sprite.width / 2;
                const hh = sprite.height / 2;
                const shape = pl.Polygon([
                  {x: -hw, y: 0},
                  {x: hw, y: 0},
                  {x: -hw, y: hh},
                  {x: hw, y: hh},
                ])
                body.createFixture(shape, {
                  filterCategoryBits : 2,
                  filterMaskBits : 1,
                  density : 1,
                  restitution: 0.5,
                })
                //console.log('pos: ')
                //
                sprite.body = body
              })
          })
          .then(() => { //Init player controll
            const joystick = scene.joystick;
            const player = scene.player;
            const rate = 2;
            const pl = planck;
            scene.ticker.add((t) => {
              const pos = player.body.getPosition();
              player.x = pos.x;
              player.y = pos.y;
              scene.camera.moveTo(player.x, player.y);

              //移动和播放动画
              if(player.storage.state != 'frozen'){
                if(joystick.offX != 0 || joystick.offY != 0){
                  if(joystick.offX < 0){
                    player.play(0, 'left')
                  }else if(joystick.offX > 0){
                    player.play(0, 'right')
                  }
  
                  //player.body.applyForceToCenter(pl.Vec2(joystick.offX * rate, joystick.offY * rate), true)
                  player.body.setLinearVelocity(pl.Vec2(joystick.offX * rate, joystick.offY * rate))
  
  
                  /*
                  player.x = player.x + rate * joystick.offX;
                  player.y = player.y + rate * joystick.offY;
                  */
                  
                }else{
                  player.body.setLinearVelocity(pl.Vec2(0, 0))
                  player.body.setAngularVelocity(0)
                }
              }else{
                //Do nothing
              }

            })
          })
          .then(() => { //测试用, 查看是否所有对象公用一个素材
            /*
            return animes.marisa.spawn()
              .then(sprite => {
                sprite.position.set(100,100)
                sprite.play(0,'left');
                scene.sortableContainer.addChild(sprite);
              })
            */
          })
          .then(() => { //遮挡层实现
            scene.world.on('pre-solve', (contact) => {
              //console.log(contact)
              //contact.setEnabled(false)
              const data1 = contact.getFixtureA().getBody().getUserData()
              const data2 = contact.getFixtureB().getBody().getUserData()
              let player = null
              let shade = null
              switch(data1.type){
                case 'player':
                  player = data1.sprite;
                  break;
                case 'shade':
                  shade = data1.sprite;
                  break;
              }
              switch(data2.type){
                case 'player':
                  player = data2.sprite;
                  break;
                case 'shade':
                  shade = data2.sprite;
                  break;
              }
              if(player != null && shade != null){
                contact.setEnabled(false)
                player.alpha = 0.5
                shade.alpha = 0.5
              }
            })
            scene.world.on('end-contact', (contact) => {
              //console.log('end')
              //contact.setEnabled(false)
              const data1 = contact.getFixtureA().getBody().getUserData()
              const data2 = contact.getFixtureB().getBody().getUserData()
              let player = null
              let shade = null
              switch(data1.type){
                case 'player':
                  player = data1.sprite;
                  break;
                case 'shade':
                  shade = data1.sprite;
                  break;
              }
              switch(data2.type){
                case 'player':
                  player = data2.sprite;
                  break;
                case 'shade':
                  shade = data2.sprite;
                  break;
              }
              if(player != null && shade != null){
                player.alpha = 1
                shade.alpha = 1
                //contact.setEnabled(false)
              }
            })
          })
          .then(() => { //World step and debug draw
            const rate = 1/60;
            const graphic = new PIXI.Graphics();
            const debug = false
            graphic.lineStyle(2, 0xFEEB77, 1);
            scene.graphic = graphic;
            //app.stage.addChild(graphic)
            scene.container.addChild(graphic)

            scene.ticker.add(() => {
              scene.world.step(rate)
              //drawWorld(graphic, scene.world)
            })
          })
          .then(() => {
            //UI
            scene.container.addChild(scene.camera.container);
            //Start ticker
            scene.ticker.start();
          })
          .then(() => { //全部初始化完毕后开始监听服务器信息

            scene.gameResetCallbacks.push(() => {
              //empty playerMap
              scene.playerMap = {};
              //empty monsterMap 
              scene.monsterMap = {};
            })


            scene.listenGlobalEventFromServer();

            scene.ticker.add(() => {
              window.now = new Date().getTime();
            });

          })
          .then(() => {
            scene.enter(scene.selfPlayerInfo);
          })
      }else{
        scene.container.visible = true;
        scene.ticker.start();

        (() => {
          emit('game_ready');

          let counter = 0;
          scene.sendPosLoop = (f) => {
            if(scene.player.storage.state != 'frozen'){
              counter += f;
              if(counter > 100){
                counter = 0;
                emit('pos', {
                  x: scene.player.position.x,
                  y: scene.player.position.y,
                })
              }
            }
          };

          //发送自己的位置信息到服务器端
          scene.ticker.add(scene.sendPosLoop);
        })();

        scene.warn('Wait for other players ...' );
      }
    },
    quit: () => {
      scene.container.visible = false;
      scene.ticker.stop();

      //将游戏回滚到初始状态
      scene.gameResetCallbacks.forEach(cb => {
        cb();
      });
      scene.gameResetCallbacksOnce.forEach(cb => {
        cb();
      });
      scene.gameResetCallbacksOnce = [];
    }, 
    movePlayerImmediately: (id, x, y) => {
      if(id == scene.selfPlayerInfo.id){
        scene.player.body.setPosition({x, y})
      }else{
        const player = scene.playerMap[id];
        if(player.inited){
          player.sprite.position.set(x, y)
        }
      }
    },
    movePlayer: (playerId, x, y) => {
      const player = scene.playerMap[playerId];
      if(player.sprite.components != null && player.sprite.components.moveSmoothly != null){
        player.sprite.components.moveSmoothly.targetPos = {x, y};
      }else{
        scene.movePlayerImmediately(playerId, x, y);
      }
    },

    updateMonstersFromWorldMsg: (monsterMap) => {
      if(monsterMap == null){
        console.warn('game_start信息里面没有包含monsterMap信息, 无法初始化怪物');
      }else{
        //1. 遍历找出scene.monsterMap里面没有的创建sprite
        //2. 仅当1完成后，遍历调整坐标
        PIXI.loader.load(() => {

          for(let id in monsterMap){
            if(scene.monsterMap[id] == null){
              const monster = monsterMap[id];
              scene.monsterMap[id] = monster;

              if(monster.type == 'sandworm'){
                monster.sprite = new PIXI.Sprite(PIXI.loader.resources['assets/sandworm.png'].texture.clone());
                scene.container.addChild(monster.sprite);
  
                scene.gameResetCallbacksOnce.push(() => {
                  monster.sprite.destroy();
                });

                //设置大小和anchor
                monster.sprite.width = 64;
                monster.sprite.height = 64;
                monster.sprite.anchor.set(0.5);

                //Hp component
                scene.addHpComponent(monster.sprite, monster.hp);

                monster.dead = false;
              }else{

              }

            }
          }
  
          for(let id in monsterMap){
            const monster = monsterMap[id];
            const monsterSprite = scene.monsterMap[id].sprite;
            if(monsterSprite != null){
              monsterSprite.position.set(monster.pos.x, monster.pos.y);
            }
          }

        })

      }
    },

    updatePlayersFromWorldMsg: (playerMap) => {
    
      for(let playerId in playerMap){
        const player = playerMap[playerId];


        //如果自己的map里没有这个玩家就生成一个, 否则修正玩家位置
        //situation: 1. scene.playerMap[playerId] == null 2. scene.playerMap[playerId] != null
        if(scene.playerMap[playerId] == null){

          scene.playerMap[playerId] = player;
          player.inited = false;

          //区分开selfPlayer
          if(playerId == scene.selfPlayerInfo.id){
            console.log('Init myself from world msg!');
            player.sprite = scene.player;
            player.inited = true;
            scene.player.visible = true;
            scene.player.alpha = 1;
            scene.movePlayerImmediately(playerId, player.pos.x, player.pos.y)
            scene.player.storage.state = 'ok'; //From fonzen state to ok

            scene.addHpComponent(player.sprite, player.hp);
          }else{
            console.log(`Spawn player ${playerId} from world msg!`);
            //WARN: 异步生成sprite, 如果同时来两个world消息，很有可能会处理出问题, 因此引入inited变量
            scene.spawnOtherPlayer()
              .then(sprite => {
                scene.sortableContainer.addChild(sprite);
                player.sprite = sprite;
                scene.movePlayerImmediately(playerId, player.pos.x, player.pos.y)
                player.inited = true;

                scene.addHpComponent(player.sprite, player.hp);
              })
          }


        }else if(player.inited){
          //const sprite = scene.playerMap[playerId].sprite;
          //sprite.position.set(player.pos.x, player.pos.y);
          scene.movePlayer(playerId, player.pos.x, player.pos.y)
        }else{
          console.warn('该玩家sprite未初始化完成，无法设置位置: ');
          console.log(player);
        }
      }
    
    },

    addBulletLifeComponent: (bullet, originData) => {
      const G = scene;
      const {srcId, type, radian, pos, speed, lifeSpan} = originData;

      //Add bulletMove component
      bullet.lifeCounter = 0;
      const BULLET_MAX_LIFE = lifeSpan * 60;
      function bulletMove(df){
        bullet.lifeCounter++;
        if(bullet.lifeCounter > BULLET_MAX_LIFE){ //测试删除ticker
          bullet.destroyWithTikcer();
          return;
        }
        const dt = df / 60;
        const d = dt * speed;
        const dx = d * Math.cos(radian);
        const dy = d * Math.sin(radian);
        bullet.x += dx;
        bullet.y += dy;
      }
      G.ticker.add(bulletMove);
      bullet.destroyWithTikcer = () => {
        G.ticker.remove(bulletMove);
        bullet.destroy();
      }
    },


    addMoveSmoothlyComponent: (sprite, speed = 5, eps = 3) => {
      const cpn = {
        targetPos: {x: sprite.x, y: sprite.y},
        speed: speed,
        eps: eps,
      };

      sprite.components.moveSmoothly = cpn;

      const movePerFrame = (f) => {
        const dx = cpn.targetPos.x - sprite.x;
        const dy = cpn.targetPos.y - sprite.y;
        if(dx == 0 && dy == 0){
          return
        }else{
          const radian = (() => {
            if(dx == 0){
              return Math.PI / 2;
            }else{
              const tan = dy / dx; //WARN: dx == 0
              return Math.atan(tan);
            }
          })();

          const stepX = speed * Math.cos(radian);
          const stepY = speed * Math.sin(radian);
          const nextX = sprite.x + stepX;
          const nextY = sprite.y + stepY;

          //终止
          if((cpn.targetPos.x - sprite.x) * (nextX - sprite.x) <= 0){
            sprite.x = cpn.targetPos.x;
            sprite.y = cpn.targetPos.y;
          }else{
            sprite.x = nextX;
            sprite.y = nextY;
          }

        }
      }

      scene.ticker.add(movePerFrame)
      scene.gameResetCallbacksOnce.push(() => {//
        scene.ticker.remove(movePerFrame)
      })
    },
    spawnOtherPlayer: () => {
      return animes.marisa.spawn()
        .then(sprite => {
          sprite.play(0,'left');
          scene.ticker.add(sprite.play);
          scene.gameResetCallbacksOnce.push(() => {
            scene.ticker.remove(sprite.play);
            sprite.destroy();
          })
          sprite.components = {}
          return sprite
        })
        .then(sprite => { //Add move component
          scene.addMoveSmoothlyComponent(sprite)
          return sprite
        })
    },
    addHpComponent: (sprite, hp) => {
      const hpComp = {
        text: new PIXI.Text('',{fontFamily : 'Arial', fontSize: 18, fill : 'white', align : 'center'}),
        hp: -1,
        set: (hp) => {
          hpComp.hp = hp;
          hpComp.text.text = 'HP: ' + hp;
        },
        get: () => {
          return hpComp.hp;
        },
      }

      //居中
      hpComp.text.anchor.set(0.5);

      if(sprite.components == null){
        sprite.components = {};
      }
      sprite.components.hp = hpComp;
      hpComp.set(hp);
      scene.container.addChild(hpComp.text);


      //ticker need to be gc
      const moveByPlayerPos = () => {
        hpComp.text.position.set(sprite.x, sprite.y - 30);
      }
      scene.ticker.add(moveByPlayerPos);
      scene.gameResetCallbacksOnce.push(() => {
        scene.ticker.remove(moveByPlayerPos);
        hpComp.text.destroy();
      });
    },
    listenGlobalEventFromServer: () => {
      const me = this;
      receive('start_game', data => {
        const {world, countdown} = data;
        scene.updatePlayersFromWorldMsg(world.playerMap);
        scene.updateMonstersFromWorldMsg(world.monsterMap);

        scene.warn('Game started! \n Kill all mobs!');

        //Countdown
        const countdownSprite = new PIXI.Text(999, {fontFamily : 'Arial', fontSize: 26, fill : 'white', align : 'center'});
        countdownSprite.anchor.set(0.5);
        countdownSprite.position.set(screen.width / 2, 50);
        me.camera.container.addChild(countdownSprite);
        const startedAt = new Date().getTime();
        const changeCountdownText = () => {
          const countdownText = parseInt((countdown - (window.now - startedAt)) / 1000);
          countdownSprite.text = countdownText;
        }
        scene.ticker.add(changeCountdownText);
        scene.gameResetCallbacksOnce.push(() => {
          scene.ticker.remove(changeCountdownText);
          countdownSprite.destroy();
        });
      });

      receive('all_pos', (allPos) => {
        for(let id in allPos.playerMap){
          if(id == scene.selfPlayerInfo.id){//不根据服务器更改自己的位置
            continue;
          }else{
            const pos = allPos.playerMap[id];
            const player = scene.playerMap[id];
            if(pos.x == player.x && pos.y == player.y){
             
            }else{//根据方向播放对应动画
              if(pos.x < player.sprite.x){
                player.sprite.play(0, 'left')
              }else{
                player.sprite.play(0, 'right')
              }
              scene.movePlayer(id, pos.x, pos.y);
            }
          }
        }
      });

      receive('hp_change_player', ({tarId, hp}) => {
        const player = scene.playerMap[tarId];
        if(player == null){

        }else{
          const originHp = player.hp;

          player.hp = hp;
          if(!player.sprite || !player.sprite.components || !player.sprite.components.hp){
            console.error('该玩家并没有hp组件，状态机出错')
          }else{
            player.sprite.components.hp.set(hp);
          }

          if(player.hp <= 0){
            player.sprite.alpha = 0.5;
            if(player.sprite.storage){
              player.sprite.storage.state = 'frozen';
              player.sprite.body.setLinearVelocity(planck.Vec2(0, 0));
            }
          }

          scene.showHpDecrease(hp - originHp, player.sprite.position);
        }
      });

      receive('hp_change_monster', ({tarId, hp}) => {
        const monster = scene.monsterMap[tarId];
        if(monster == null){
        
        }else{
          const originHp = monster.hp;
          monster.hp = hp;
          if(monster.hp <= 0){
            monster.dead = true;
            monster.sprite.alpha = 0.5;
          }
          if(!monster.sprite || !monster.sprite.components || !monster.sprite.components.hp){
            console.error('该怪物并没有hp组件，状态机出错')
          }else{
            monster.sprite.components.hp.set(hp);
          }

          scene.showHpDecrease(hp - originHp, monster.sprite.position);
        }
      });

      receive('spawn_monster', (monster) => {
        const {id, type, pos, hp, } = monster;

        if(scene.monsterMap[id] != null){
          console.error('为什么服务器刚传spawn_monster信息过来，map里面却已经有一个该id的怪物?');
        }else{
          scene.monsterMap[id] = monster;
          if(hp > 0){
            monster.dead = false;
          }else{
            monster.dead = true;
          }

          //生成怪物sprite
          if(type == 'cirno'){
            console.log('Spawn cirno: ');
            animes.cirno.spawn().then((sprite) => {
              console.log('Sprite of Cirno is ready');
              sprite.play(0,'left');
              scene.ticker.add(sprite.play);
              scene.gameResetCallbacksOnce.push(() => {
                scene.ticker.remove(sprite.play);
                sprite.destroy();
              });
              sprite.components = {};
              sprite.position.set(pos.x, pos.y);
              scene.container.addChild(sprite);
              monster.sprite = sprite;
              scene.addHpComponent(monster.sprite, monster.hp);
              scene.popFullScreenImage('assets/alert.png', 3, 0.5);
            });


            //危险公告
            scene.warn('BOSS Appeard!', 'red', 26);
          }
        }

      });

      const monsterMove = (df) => {
        const dt = df / 60;
        for(let id in scene.monsterMap){
          const monster = scene.monsterMap[id];
          if(monster.dead == false){
            if(!monster.speed || monster.speed == 0){
            
            }else{
              const nextPos = calTarPos(monster.pos, monster.radian, monster.speed, dt)
              monster.pos = nextPos;
              monster.sprite.position.set(nextPos.x, nextPos.y);
            }
          }else{
            //Dead
          }
        }
      }

      //move monster, 移动怪物
      scene.ticker.add(monsterMove);

      // monster_move, monster_stop, 
      receive('monster_move', ({id, speed, radian, pos, }) => {
        const monster = scene.monsterMap[id];
        if(monster == null){
        
        }else{
          if(monster.type == 'sandworm'){
            //调转方向
            if(Math.cos(radian) > 0){ //向右
              monster.sprite.texture = PIXI.loader.resources['assets/sandworm_right.png'].texture.clone();
            }else{
              monster.sprite.texture = PIXI.loader.resources['assets/sandworm.png'].texture.clone();
            }
  
            monster.speed = speed;
            monster.radian = radian;
  
            monster.pos = pos;
            monster.sprite.position.set(pos.x, pos.y);
          }else if(monster.type == 'cirno'){
            //调转方向
            if(Math.cos(radian) > 0){ //向右
              monster.sprite.play(0, 'right');
            }else{
              monster.sprite.play(0, 'left');
            }
            monster.speed = speed;
            monster.radian = radian;
            monster.pos = pos;
            monster.sprite.position.set(pos.x, pos.y);
          }
        }
      });

      receive('monster_stop', ({id, pos, }) => {
        const monster = scene.monsterMap[id];
        if(monster == null){
        
        }else{
          monster.speed = 0;
          monster.sprite.position.set(pos.x, pos.y);
          monster.pos = pos;
        }
      });


      //清除循环发送pos
      //需要获取结算信息，比如分数之类的
      receive('game_over', (settlementInfo) => {
        scene.ticker.remove(scene.sendPosLoop);
        scene.quit();
        app.stage.scenes.readyRoom.enter({
          action: 'openSettlementPanel',
          data: settlementInfo,
        });
      });

    },

    loadTextures: () => {
      return new Promise((resolve, reject) => {
        PIXI.loader
          .safeAdd('assets/sandworm_right.png')
          .safeAdd('assets/sandworm.png')
          .safeAdd('assets/slimeball.png')
          .safeAdd('assets/sword_light1.png')
          .safeAdd('assets/iceshoot.png')
          .safeAdd('assets/boss_cirno.jpeg')
          .load(() => {
            resolve()
          })
      })
    },

    getCooldownTimeByWeapon: () => {
      const weapon = window.localStorage.getItem('weapon');
      if(weapon == 'bullet1'){
        return 3000;
      }else if(weapon == 'wood_sword'){
        return 600;
      }
    },

    showHpDecrease: (hp, pos, lifeSpan = 1500, color = 'red') => {
      //在目标位置的上方显示文字。增加ticker，在一定时间后清除该文字和ticker
      const text = new PIXI.Text('',{fontFamily : 'Arial', fontSize: 20, fill : color, align : 'center'});
      text.anchor.set(0.5);
      text.text = '-' + hp;
      text.position.set(pos.x,pos.y - 30);
      scene.container.addChild(text);

      const startedAt = new Date().getTime();

      const lifeCounter = () => {
        if(window.now - startedAt > lifeSpan){
          scene.ticker.remove(lifeCounter);
          text.destroy();
        }
      }
      scene.ticker.add(lifeCounter);
    },

    popFullScreenImage: (imgPath, lifeSpan = 2, alpha = 1) => {
      const sprite = new PIXI.Sprite(PIXI.loader.resources[imgPath].texture.clone());
      sprite.alpha = alpha;
      sprite.width = screen.width;
      sprite.height = window.getScreenHeight();
      window.addSpriteWithLifespan(sprite, 3);
    },

    warn: (text = '', color = 'white', size = 18) => {
      if(scene.logger != null){
        scene.logger.alpha = 0;
      }

      const sprite = new PIXI.Text(text, {fontFamily : 'Arial', fontSize: size, fill : color, align : 'center'});
      sprite.anchor.set(0.5);
      sprite.position.set(screen.width / 2, window.getScreenHeight() / 2);
      window.addSpriteWithLifespan(sprite, 3);

      scene.logger = sprite;
    },


  }
  return Promise.resolve(scene);
}
