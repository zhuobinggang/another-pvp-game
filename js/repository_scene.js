loadRepositoryScene = () => {
  const scene = {
    inited: false,
    container: null,
    G: null, 
    weaponMap: {},
    enter: () => {
      if(!scene.inited){
        scene.inited = true;
        scene.init().then(() => {
          scene.enter();
        });
      }else{
        scene.container.visible = true;

        const cachedWeapon = window.localStorage.getItem('weapon');
        if(!cachedWeapon){
          scene.switchWeapon('bullet1');
        }else{
          scene.switchWeapon(cachedWeapon);
        }

      }
    }, 
    initGlobalConfiguration: () => {
      if(!window.localStorage.getItem('weapon')){
        window.localStorage.setItem('weapon', 'bullet1');
      }
    },
    switchWeapon: (weapon) => {
      window.localStorage.setItem('weapon', weapon);
      if(scene.weaponMap[weapon] == null){
        console.error('不存在名为:' + weapon + ' 的武器sprite');
      }else{
        scene.highlightWeapon(scene.weaponMap[weapon]);
      }
    },
    init: () => {
      scene.container = new PIXI.Container();
      scene.initGlobalConfiguration();
      return new Promise((resolve, reject) => {
        PIXI.loader
  				.add(constants.REPERTORY_SCENE_PATH.BG)
  				.add(constants.REPERTORY_SCENE_PATH.RETURN_BTN)
  				.add(constants.REPERTORY_SCENE_PATH.LOCK)
  				.add(constants.REPERTORY_SCENE_PATH.SWORD)
  				.add(constants.REPERTORY_SCENE_PATH.GUN)
  				.load((_, res) => {
  					const repertory = scene.container;
  					repertory.zIndex = 999;
  					//repertory.visible = true;
  					(() => {
  						const bg = new PIXI.Sprite(res[constants.REPERTORY_SCENE_PATH.BG].texture);
  						repertory.addChild(bg);
  
  						const returnBtn = new PIXI.Sprite(res[constants.REPERTORY_SCENE_PATH.RETURN_BTN].texture);
  						returnBtn.position.set(10, 10);
  						repertory.addChild(returnBtn);
              returnBtn.interactive = true;
              returnBtn.on('pointerdown', () => {
                scene.quit();
                app.stage.scenes[constants.SCENES.START].enter();
              });
  						
  						(() => {
  							for(let i = 0; i < 2; i++) {
  								for(let j = 0; j < 4; j++) {
  									if((i==1&&j==0)||(i==1&&j==1))	continue;
  									const lock = new PIXI.Sprite(res[constants.REPERTORY_SCENE_PATH.LOCK].texture);
  									lock.position.set(182+j*107, 115+i*124);
  									repertory.addChild(lock);
  								}
  							}
  						})();
  						
  						const sword = new PIXI.Sprite(res[constants.REPERTORY_SCENE_PATH.SWORD].texture);
  						sword.position.set(182, 239);
  						repertory.addChild(sword);
              scene.weaponMap['wood_sword'] = sword;
              sword.interactive = true;
              sword.on('pointerdown', () => {
                scene.switchWeapon('wood_sword');
              });
  						
  						const gun = new PIXI.Sprite(res[constants.REPERTORY_SCENE_PATH.GUN].texture);
  						gun.position.set(289, 239);
  						repertory.addChild(gun);
              scene.weaponMap['bullet1'] = gun;
              gun.interactive = true;
              gun.on('pointerdown', () => {
                scene.switchWeapon('bullet1');
              });

  					})();
  					repertory.width = screen.width;
  					repertory.height = window.getScreenHeight();

            app.stage.addChild(repertory);
  					//scene.container.addChild(repertory);
            scene.initHighlight();
            resolve(null);
  				});
      })
    },
    quit: () => {
      scene.container.visible = false;
    },
    // WARN: This should be involved when inited
    initHighlight: () => {
      scene.G = new PIXI.Graphics();
      scene.container.addChild(scene.G);
    },
    highlightWeapon: (sprite) => {
      if(sprite != null){
        //完成选中高亮功能
        const G = scene.G;
        G.clear();
        G.beginFill(0, 0);
        G.lineStyle(3, 0xffd900);
        G.moveTo(sprite.x, sprite.y);
        G.lineTo(sprite.x + sprite.width, sprite.y);
        G.lineTo(sprite.x + sprite.width, sprite.y + sprite.height);
        G.lineTo(sprite.x, sprite.y + sprite.height);
        G.lineTo(sprite.x, sprite.y);
        G.endFill();
      }
    },
  }

  return scene;
}
