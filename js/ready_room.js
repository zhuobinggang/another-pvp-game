
function loadReadyRoomScene(){



  const scene = {
    inited: false,
    container: null,
    ticker: null, 
    room: null, //Room info
    seats: null, //
    playerMap: {},
    startBtn: null, 
    init: () => {
      return new Promise((resolve, reject ) => {

        const ticker = new PIXI.ticker.Ticker();
        scene.ticker = ticker;

    		PIXI.loader
  				.safeAdd(constants.READY_SCENE_PATH.BG)
  				.safeAdd(constants.READY_SCENE_PATH.READY_BG)
  				.safeAdd(constants.READY_SCENE_PATH.START_BTN)
  				.safeAdd(constants.READY_SCENE_PATH.READY_RETURN_BTN)
  				.safeAdd(constants.READY_SCENE_PATH.READY_STATUS)
  				.load((_, res) => {
  					const ready = new PIXI.Container();
  					ready.zIndex = 999;
  					ready.visible = true;
  					(() => {
  						const bbg = new PIXI.Sprite(res[constants.READY_SCENE_PATH.BG].texture);
  						ready.addChild(bbg);
  						const bg = new PIXI.Sprite(res[constants.READY_SCENE_PATH.READY_BG].texture);
  						ready.addChild(bg);
  
  						const startBtn = new PIXI.Sprite(res[constants.READY_SCENE_PATH.START_BTN].texture);
  						startBtn.anchor.set(0.5);
  						startBtn.position.set(bg.width / 2, 360);
  						ready.addChild(startBtn);
              startBtn.visible = false;
              scene.startBtn = startBtn;
              addButtonComponent(startBtn);
              startBtn.addPointDownListner(() => {
                socket.emit('start_game');
              });
              
  
  						const returnBtn = new PIXI.Sprite(res[constants.READY_SCENE_PATH.READY_RETURN_BTN].texture);
  						returnBtn.position.set(100, 0);
  						ready.addChild(returnBtn);
              addButtonComponent(returnBtn);
              //window.returnBtn = returnBtn;
              returnBtn.addPointDownListner(() => {
                scene.quit();
                socket.disconnect();
                app.stage.scenes[constants.SCENES.START].enter();
              });

  						(() => {
                scene.seats = [];
  							for(let i = 0; i < 4; i++) {


                  const text = new PIXI.Text(i,{fontFamily : 'Arial', fontSize: 18, fill : 'white', align : 'center'});
                  text.anchor.set(0.5);
                  text.position.set(185+i*142, 150);
                  ready.addChild(text)

  								const readyStatus = new PIXI.Sprite(res[constants.READY_SCENE_PATH.READY_STATUS].texture);
  								readyStatus.position.set(175+i*142, 250);
  								ready.addChild(readyStatus);

                  text.visible = false;
                  readyStatus.visible = false;
                  scene.seats.push({
                    info: text,
                    readyStatus,
                  });
  							}
  						})();


  					})();
  					ready.width = screen.width;
  					ready.height = screen.height;

            app.stage.addChild(ready);

            scene.container = ready;

            window.readyScene = scene;

            resolve(ready);
  				});     
      
      }).then(() => { //设定好socket行为
        socket.on('room', room => {
          console.log("New room info");
          console.log(room);
          scene.room = room;
          scene.updateRoomShow();
        });

        socket.on('enter_game', () => {
          console.log("On start_game");
          //NOTE: 不调用quit方法，因为这样会引起退出房间，转而调用hide()
          scene.hide();
          //console.log(app.storage.playerInfo);
          app.stage.scenes.multiGame.enter(app.storage.playerInfo);
        });

        return null;
      })
   
    },
    updateRoomShow: ()=> {
      const room = scene.room
      if(scene.inited){
        console.log('update room show')

        //清空原来的显示
        scene.seats.forEach(seatNode => {
          seatNode.info.visible = false;
          seatNode.readyStatus.visible = false;
        });

        room.seats.forEach((player, index) => {
          console.log(index)
          console.log(player)
          const seatNode = scene.seats[index];
          if(seatNode != null){
            seatNode.info.text = player.firstName;
            seatNode.info.visible = true;
            seatNode.readyStatus.visible = true;
          }

          //判断自己的话，字体变green
          if(player.id == app.storage.playerInfo.id){
            seatNode.info.style.fill = 'green';
            seatNode.info.text = '我 \n' + seatNode.info.text;
          }else{
            seatNode.info.style.fill = 'white';
          }
        })

        //显示开始按钮
        if(room.seats[0].id == app.storage.playerInfo.id && room.seats.length > 1){
          scene.startBtn.visible = true;
        }else{
          scene.startBtn.visible = false;
        }

      }else{
        console.log('now can not update room show')
      }
    },
    enter: (action) => {
      window.readyRoomScene = scene;

      if(scene.inited){
        scene.container.visible = true;
        scene.ticker.start();

        //每次进入房间都应该重新请求
        socket.emit('room_info', res => {
          if(res.ret == 1000){
            scene.room = res.data;
            scene.updateRoomShow();
            
            //更新playerMap
            res.data.seats.forEach(player => {
              scene.playerMap[player.id] = player;
            });

            //弹窗显示分数
            if(action && action.action == 'openSettlementPanel'){

              const world = action.data.world;

              const playerDamageMap = (() => {
                const monsterRecord = action.data.monsterRecord;
                const result = {};
                monsterRecord.damage.forEach(rec => {
                  if(rec.srcType == 'player'){
                    if(result[rec.srcId] == null){
                      result[rec.srcId] = rec.damage;
                    }else{
                      result[rec.srcId] += rec.damage;
                    }
                  }
                });
                return result;
              })();

              console.log('playerDamageMap:');
              console.log(playerDamageMap);

              const infos = scene.room.seats.map(player => {
                const name = player.firstName;
                const score = playerDamageMap[player.id] || 0;
                const result = { name, score }
                if(player.id == app.storage.playerInfo.id){
                  result.isMe = true;
                }
                return result;
              });

              console.log('----------');
              console.log(action.data);
              console.log('----------');

              scene.openSettlementPopup(infos, scene.container);
            }

          }else{
            alert('Get room info failed, quit room');
            scene.quit();
            app.stage.scenes[constants.SCENES.START].enter();
          }
        })

      }else{
        scene.inited = true;
        scene.init().then(() => {
          scene.enter(action);
        })
      }

    },
    quit: () => {
      if(scene.container){
        scene.container.visible = false
      }
      if(scene.ticker){
        scene.ticker.stop()
      }
      socket.emit('leave_room', 0);
      //不应该直接进入开始界面， 因为有多人游戏和开始界面两个选择
      //app.stage.scenes[constants.SCENES.START].enter();
    },
    hide: () => {
      if(scene.container){
        scene.container.visible = false
      }
      if(scene.ticker){
        scene.ticker.stop()
      }
    },
    openSettlementPopup: (infos, parentContainer) => {
      PIXI.loader
        .safeAdd(constants.READY_SCENE_PATH.SETTLEMENT_BG)
        .safeAdd(constants.READY_SCENE_PATH.SETTLEMENT_BTN)
        .load(() => {
          const settlementPopup = (() => {
            const res = PIXI.loader.resources;

            const result = new PIXI.Container();
            
            const bg = new PIXI.Sprite(res[constants.READY_SCENE_PATH.SETTLEMENT_BG].texture);
            result.addChild(bg);

            const retBtn = new PIXI.Sprite(res[constants.READY_SCENE_PATH.SETTLEMENT_BTN].texture);
            result.addChild(retBtn);
            retBtn.anchor.set(0.5, 0);
            retBtn.position.set(result.width / 2 - 25, 330);

            retBtn.interactive = true;
            retBtn.on('pointerdown', () => {
              settlementPopup.destroy();
            });

            return result;
          })();

          parentContainer.addChild(settlementPopup);
          //settlementPopup.width = screen.width;
          //settlementPopup.height = screen.height;
          
          // Show info
          const texts = [];
          for(let i=0;i<4;i++){
            const text = new PIXI.Text('',{fontFamily : 'Arial', fontSize: 18, fill : 'white', align : 'center'});
            text.anchor.set(0.5);
            settlementPopup.addChild(text);
            text.position.set(205 + i * 130 , 200);
            texts.push(text);
          }

          for(let i=0;i<infos.length;i++){
            const info = infos[i];
            texts[i].text = info.name + '\n' + '伤害:' + info.score;
            if(info.isMe){
              texts[i].style.fill = 'yellow';
            }
          }
        });
    },
  }
  return Promise.resolve(scene);
}
