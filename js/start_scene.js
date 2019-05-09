function loadStartScene(){
	return new Promise((resolve, reject) => {

		PIXI.loader
			.add(constants.START_SCENE_PATH.BG)
			.add(constants.START_SCENE_PATH.BAG_BTN)
			.add(constants.START_SCENE_PATH.MULTI_BTN)
			.add(constants.START_SCENE_PATH.SINGLE_BTN)
			.load((_, res) => {
				const container = new PIXI.Container();
				const background = new PIXI.Sprite(res[constants.START_SCENE_PATH.BG].texture);
				const bt1 = new PIXI.Sprite(res[constants.START_SCENE_PATH.BAG_BTN].texture);
				bt1.x = 130;
				bt1.y = 60;
        bt1.anchor.x = 0.5;
        bt1.anchor.y = 0.5;
        addButtonComponent(bt1);
        bt1.addPointDownListner(() => {
          app.stage.scenes.start.quit();
          app.stage.scenes.repository.enter();
        });

        const bt2 = (() => {
     			const bt2 = new PIXI.Sprite(res[constants.START_SCENE_PATH.MULTI_BTN].texture)
      		bt2.x = 130
      		bt2.y = 160
          bt2.anchor.x = 0.5
          bt2.anchor.y = 0.5
          addButtonComponent(bt2)
          bt2.addPointDownListner(() => {
            if(app.stage.popups[constants.POPUPS.JOIN_ROOM]){
              app.stage.popups[constants.POPUPS.JOIN_ROOM].open()
            }else{
              console.warn(`There is no popup named ${constants.POPUPS.JOIN_ROOM} has been loaded`)
            }
          });
          return bt2
        })();
				const bt3 = new PIXI.Sprite(res[constants.START_SCENE_PATH.SINGLE_BTN].texture)
				bt3.x = 130
				bt3.y = 260
        bt3.anchor.x = 0.5
        bt3.anchor.y = 0.5
        addButtonComponent(bt3)
				container.addChild(background)
				container.addChild(bt1)
				container.addChild(bt2)
				container.addChild(bt3)

        const scene = {
          name: 'start',
          container: container, 
          enter: () => {
            container.visible = true;
          },
          quit: () => {
            container.visible = false;
          }
        }
				resolve(scene);
			})
	})
}

function loadMultiPlayerPopup(){
  return new Promise((resolve, reject) => {
		PIXI.loader
        .add(constants.START_SCENE_PATH.POPUP_BG)
        .add(constants.START_SCENE_PATH.CLOSE_BTN)
        .add(constants.START_SCENE_PATH.CREATE_ROOM_BTN)
        .add(constants.START_SCENE_PATH.NUMBER_BTN)
        .add(constants.START_SCENE_PATH.CONFIRM_BTN)
        .load((_, res) => {

          const popup = {
            name: constants.POPUPS.JOIN_ROOM,
            container: null, //Init by open
            init: () => {
              const c = new PIXI.Container();
              c.zIndex = 999;
              c.visible = false;

              (() => {//Add sprites
                const bg = new PIXI.Sprite(res[constants.START_SCENE_PATH.POPUP_BG].texture);
                c.addChild(bg);

                const closeBtn = new PIXI.Sprite(res[constants.START_SCENE_PATH.CLOSE_BTN].texture); 
                closeBtn.position.set(320,15);                window.closeBtn=closeBtn;
                addButtonComponent(closeBtn, 0.8);
                closeBtn.addPointDownListner(() => {
                  popup.close();
                })
                c.addChild(closeBtn);   
                //window.closeBtn = closeBtn;

                const createRoomBtn = new PIXI.Sprite(res[constants.START_SCENE_PATH.CREATE_ROOM_BTN].texture); 
                createRoomBtn.anchor.set(0.5);
                createRoomBtn.position.set(bg.width / 2, 55);
                c.addChild(createRoomBtn);
                
                const numberInputPanel = new PIXI.Container();
                (() => {// Init numberInputPanel
                  let clearBtn = null;
                  let zeroBtn = null;
                  let backspaceBtn = null;
                  for(let i=0;i<3;i++){
                    for(let j=0;j<4;j++){
                      const btn = new PIXI.Sprite(res[constants.START_SCENE_PATH.NUMBER_BTN].texture);
                      btn.anchor.set(0.5);
                      btn.x = i * btn.width + (btn.width / 2);
                      btn.y = j * btn.height + (btn.height / 2);
                      numberInputPanel.addChild(btn);

                      const num = j * 3 + i + 1;
                      
                      const text = new PIXI.Text(num,{fontFamily : 'Arial', fontSize: 18, fill : 'white', align : 'center'});
                      text.anchor.set(0.5);
                      text.x = btn.x;
                      text.y = btn.y;
                      numberInputPanel.addChild(text);

                      addButtonComponent(btn, 0.5);
                      if(num <10){
                        btn.addPointDownListner(() => {
                          popup.text.text = popup.text.text.concat(num);
                        })             
                      }else{
                        switch(num){
                          case 10:
                            clearBtn = btn;
                            text.text = 'C';
                            break;
                          case 11:
                            zeroBtn = btn;
                            text.text = '0';
                            break;
                          case 12:
                            backspaceBtn = btn;
                            text.text = 'X';
                            break;
                        }
                      }
                    }
                  }
                  clearBtn.addPointDownListner(() => {
                    popup.text.text = '';
                  });
                  zeroBtn.addPointDownListner(() => {
                    popup.text.text = popup.text.text.concat(0);
                  });
                  backspaceBtn.addPointDownListner(() => {
                    popup.text.text = popup.text.text.slice(0, -1);
                  });
                })();
                numberInputPanel.pivot.set(numberInputPanel.width / 2, numberInputPanel.height / 2);
                numberInputPanel.position.set(bg.width / 2, 245);
                window.numberInputPanel = numberInputPanel;
                c.addChild(numberInputPanel);

                (() => { //Room number
                  const text = new PIXI.Text('',{fontFamily : 'Arial', fontSize: 18, fill : 'white', align : 'center'});
                  text.anchor.set(0.5);
                  text.x = bg.width / 2;
                  text.y = 130;
                  popup.text = text;
                  c.addChild(text);
                })();


                const confirmBtn = new PIXI.Sprite(res[constants.START_SCENE_PATH.CONFIRM_BTN].texture); 
                confirmBtn.anchor.set(0.5);
                confirmBtn.position.set(bg.width /2, 355);
                addButtonComponent(confirmBtn);
                confirmBtn.addPointDownListner(() => {
                  /*
                  console.log('TODO: 直接进入地图等待其他玩家');
                  app.stage.scenes.start.quit();
                  //app.stage.scenes.multiGame.enter();
                  app.stage.scenes.readyRoom.enter();
                  */
                  function changeSceneToReadyRoom(){
                    socket.emit('enter_room', 0, (cb) => {
                      if(cb.ret == 1000){
                        app.stage.scenes.start.quit();
                        //app.stage.scenes.multiGame.enter();
                        app.stage.scenes.readyRoom.enter();
                      }else{
                        alert('进入房间失败，错误信息: ', cb.msg);
                      }
                    });
                  }

                  //如何判断是断联然后

                  if(null == window.io){
                    alert('必须引入socketio用与服务器通讯')
                  }else if(null != window.socket){
                    if(socket.connected){
                      changeSceneToReadyRoom();
                    }else{
                      socket.connect();
                      alert('连接已断开， 请重试');
                    }
                  }else{
                    alert('尚未连接服务器， 请重试');

                    window.socket = io.connect('http://139.199.73.230:8000', {
                      reconnection: false,
                    });

                    /*
                    window.socket = io.connect('http://localhost:8000', {
                      reconnection: false,
                    });
                    */
                    socket.on('connect', () => {
                      console.log('Connected!')
                      //每次重新连接都要重新获取角色信息
                      socket.emit('player_info', (info) => {
                        if(info.ret != 1000){
                          alert("获取用户信息失败, 请重试");
                          socket.disconnect();
                        }else{
                          console.log("Get player info successfully");
                          app.storage.playerInfo = info.data;
                        }
                      })
                    })
                  }
                });
                c.addChild(confirmBtn);

                //window.confirmBtn = confirmBtn;
                //window.popup = c;
                //

              })();

              
              (() => {//Set scale and pivot
                const width = screen.width / 2;
                const height = screen.height * 2 / 3;
                c.position.set(screen.width / 2,screen.height / 2);
                c.pivot.set(c.width / 2, c.height / 2);
                c.scale.set(constants.POPUPS.JOIN_ROOM_SCALE);
                window.c = c;
              })();

              popup.container = c;
              app.stage.scenes.start.container.addChild(c);
              addPopupComponent(c);
            },
            open: () => {
              if(null != popup.container){
                popup.container.popup.open()
              }else{
                console.error('You must init the popup first');
              }

            },
            close: () => {
              if(null != popup.container){
                popup.container.popup.close(() => {
                  popup.container.visible = false;
                });
              }else{
                console.error('You must init the popup first');
              }
            }
          }
          resolve(popup)
        });
  })
}


function init(){
  app.stage.scenes = {} 
  app.stage.popups = {} //popup要复用
  app.stage.sortableChildren = true;
  app.storage = {}
  return loadStartScene()
    .then(startScene => {
      return loadMultiPlayerPopup()
        .then(popup => {
          return [startScene, popup]
        })
    })
    .then(([startScene, popup]) => {
      if(null == window.loadMultiGameScene){
        alert('必须引入多人游戏场景js文件');
        return [startScene, popup, null];
      }else{
        return loadMultiGameScene().then(multiGameScene => {
          return [startScene, popup, multiGameScene];
        })
      }
    })
    .then(([startScene, popup, multiGameScene]) => { //start scene
      app.stage.scenes[constants.SCENES.START] = startScene;
      let screenWidth = screen.width;
      let screenHeight = screen.height;
      if(screen.width < screen.height){
        [screenWidth, screenHeight] = [screenHeight, screenWidth]
      }
  		const scaleX = screenWidth / startScene.container.width
  		const scaleY = screenHeight / startScene.container.height
      startScene.container.scale.x = scaleX;
      startScene.container.scale.y = scaleY;
  		app.stage.addChild(startScene.container);
      return Promise.resolve([popup, multiGameScene]);
    })
    .then(([popup, multiGameScene]) => { //popup
      popup.init()
      app.stage.popups[constants.POPUPS.JOIN_ROOM] = popup;
      return [multiGameScene];
    })
    .then(([multiGameScene]) => { // multi game scene
      app.stage.scenes.multiGame = multiGameScene;
      return [];
    })
    .then(() => { // Repository scene
      if(window.loadRepositoryScene == null){
        console.error('请先引入repository_scene.js以初始化仓库');
        return null;
      }else{
        app.stage.scenes.repository = loadRepositoryScene();
        return null;
      }
    })
    .then(() => { //Ready room
      if(null == loadReadyRoomScene){
        alert('必须引入ready_room.js以初始化准备房间')
        return null
      }else{
        return loadReadyRoomScene()
          .then(readyRoomScene => {
            app.stage.scenes.readyRoom = readyRoomScene;
          })     
      }
    })
    .then(() => { //An alternative to window.alert()
      window.addSpriteWithLifespan = (sprite, lifespan = 3) => {
        setTimeout(() => {
          if(!sprite._destroyed){
            sprite.destroy();
          }
        }, lifespan * 1000);
        app.stage.addChild(sprite);
      }

      PIXI.loader.safeAdd('assets/alert.png').load(() => {
        window.alert = (text = '') => {
          const c = new PIXI.Container();
          const sprite = new PIXI.Sprite(PIXI.loader.resources['assets/alert.png'].texture.clone());
          sprite.width = screen.width;
          sprite.height = screen.height;
          //点击后alpha = 0
          sprite.interactive = true;
          sprite.on('pointerdown', () => {
            c.destroy();
          });
          c.addChild(sprite);

          //Add Text
          const textSprite = new PIXI.Text(text, {fontFamily : 'Arial', fontSize: 40, fill : 'orange', align : 'center'});
          textSprite.anchor.set(0.5);
          textSprite.position.set(screen.width / 2, screen.height / 2);
          c.addChild(textSprite);

          window.addSpriteWithLifespan(c, 2);
        }
      })
    })
}
