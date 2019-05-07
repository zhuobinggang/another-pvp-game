function rectagleByGid(gid, tsx){
  const row = Math.floor(gid / tsx.columns);
  const col = gid % tsx.columns;
  const x = col * tsx.tilewidth;
  const y = row * tsx.tileheight;
  //console.log(gid, x, y);
  return new PIXI.Rectangle(x, y, tsx.tilewidth, tsx.tileheight);
}

window.animes = {
  marisa: {
    tsxPath: 'assets/marisa.json',
    animation: {
      left: [3, 4, 5, 4],
      leftStop: [4],
      right: [6, 7, 8, 7],
      rightStop: [7],
    },
    spawn: () => {
      return new Promise((resolve, reject) => {
        PIXI.loader.safeAdd(animes.marisa.tsxPath).load(() => {
          resolve(PIXI.loader.resources[animes.marisa.tsxPath].data);
        });
        /*
        return new Promise((resolve, reject) => {
          if(PIXI.loader.resources[animes.marisa.tsxPath] != null){
            resolve(PIXI.loader.resources[animes.marisa.tsxPath].data)
          }else{
            PIXI.loader
              .add(animes.marisa.tsxPath)
              .load(() => {
                resolve(PIXI.loader.resources[animes.marisa.tsxPath].data)
              })       
          }
          */
      }).then((tsx) => {
        return new Promise((resolve, reject) => {
          const imgPath = 'assets/' + tsx.image;
          PIXI.loader.safeAdd(imgPath).load(() => {
            resolve([tsx, PIXI.loader.resources[imgPath].texture.clone()])
          })
        })
      }).then(([tsx, texture]) => {
        const result = new PIXI.Sprite(texture);
        const marisa = animes.marisa;
        texture.frame = rectagleByGid(marisa.animation.rightStop[0], tsx);

        (() => { //Make animation
          let aniName = 'rightStop';
          let curFrame = 0;
          let counter = 0;
          const howManyMsChangeFrame = 40;
          result.play = (t, name) => {

            if(null == name || name == aniName){
              counter += t;
              //console.log(counter);
              if(counter > howManyMsChangeFrame){ //change frame
                curFrame = (curFrame + 1) % marisa.animation[aniName].length;
                counter = 0;
                const frame = rectagleByGid(marisa.animation[aniName][curFrame] ,tsx);
                //console.log(curFrame, frame);
                result.texture.frame = frame;
              }
            }else{
              if(marisa.animation[aniName] == null){
                console.error("Wrong animation name for marisa: " + name);
                return
              }else{ //播放新动画
                curFrame = 0;
                counter = 0;
                aniName = name;
                result.texture.frame = rectagleByGid(marisa.animation[name][0] ,tsx);
              }           
            }
          }
        })();


        result.scale.set(0.5)
        result.anchor.set(0.5)
        return result;
      })
      /*
       * Spawn to shared ticker
      .then(sprite => {
        PIXI.ticker.shared.add((t) => {
          sprite.play(t)
        })
        //window.sprite = sprite;
        return sprite
      })
      */
    }
  },

  cirno: {
    tsxPath: 'assets/9.json',
    animation: {
      left: [3, 4, 5, 4],
      leftStop: [4],
      right: [6, 7, 8, 7],
      rightStop: [7],
    },
    spawn: () => {
      return new Promise((resolve, reject) => {
        PIXI.loader.safeAdd(animes.cirno.tsxPath).load(() => {
          resolve(PIXI.loader.resources[animes.cirno.tsxPath].data);
        });
      }).then((tsx) => {
        return new Promise((resolve, reject) => {
          const imgPath = 'assets/' + tsx.image;
          PIXI.loader.safeAdd(imgPath).load(() => {
            resolve([tsx, PIXI.loader.resources[imgPath].texture.clone()])
          })
        })
      }).then(([tsx, texture]) => {
        const result = new PIXI.Sprite(texture);
        const cirno = animes.cirno;
        texture.frame = rectagleByGid(cirno.animation.rightStop[0], tsx);

        (() => { //Make animation
          let aniName = 'rightStop';
          let curFrame = 0;
          let counter = 0;
          const howManyMsChangeFrame = 40;
          result.play = (t, name) => {

            if(null == name || name == aniName){
              counter += t;
              //console.log(counter);
              if(counter > howManyMsChangeFrame){ //change frame
                curFrame = (curFrame + 1) % cirno.animation[aniName].length;
                counter = 0;
                const frame = rectagleByGid(cirno.animation[aniName][curFrame] ,tsx);
                //console.log(curFrame, frame);
                result.texture.frame = frame;
              }
            }else{
              if(cirno.animation[aniName] == null){
                console.error("Wrong animation name for cirno: " + name);
                return
              }else{ //播放新动画
                curFrame = 0;
                counter = 0;
                aniName = name;
                result.texture.frame = rectagleByGid(cirno.animation[name][0] ,tsx);
              }           
            }
          }
        })();


        result.scale.set(0.5)
        result.anchor.set(0.5)
        return result;
      })
    }
  },

}

function testAnimation(){
  animes.marisa.spawn().then((sprite) => {
    app.stage.addChild(sprite);
    sprite.play(0, 'right');
    return sprite;
  }).then(sprite => {
    PIXI.ticker.shared.add(sprite.play)
    //window.sprite = sprite;
    return sprite
  })
}



