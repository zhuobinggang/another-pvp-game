declare const constants : any;
declare const PIXI: any;

interface Popup{
  open?: (callback ?: () => void) => void;
  close?: (callback ?: () => void) => void;
}

function addPopupComponent(sprite: any, interval: number){
  let initialScale = sprite.scale.x;
  let currentScale = sprite.scale.x;
  let tarScale = -1;
  let popup : Popup = {};
  interval ? null : interval = constants.POPUPS.DEFAULT_INTERVAL;
  const totalFrames = interval * 60;
  let totalDistance = -1;
  let openCb = [];
  let closeCb = [];


  popup.open = (cb) => {
    sprite.visible = true;
    currentScale = 0;
    tarScale = initialScale;
    totalDistance = tarScale - currentScale;
    cb ? openCb.push(cb) : null;
  }

  popup.close = (cb) => {
    //sprite.visible = false;
    tarScale = 0;
    totalDistance = tarScale - currentScale;
    cb? closeCb.push(cb) : null;
    closeCb.push(() => {
      sprite.visible = false;
    });
  }

  PIXI.ticker.shared.add((frames) => {
    //frames / totalFrames == distance / totalDistance;
    if(tarScale == -1 || totalDistance == -1){
      return
    }
    if(currentScale == tarScale){
      return
    }
    const distance = totalDistance * frames / totalFrames;
    const nextScale = currentScale + distance;
    if((tarScale - currentScale) * (tarScale - nextScale) < 0){
      currentScale = tarScale;
      //Check if should callback
      if(nextScale < currentScale){
        console.log('call closeCbs')
        closeCb.forEach(cb => {
          cb();
        });
        closeCb = [];
      }else{
        console.log('call openCbs')
        openCb.forEach(cb => {
          cb();
        });
        openCb = [];
      }
    }else{
      currentScale = nextScale;
    }
    sprite.scale.set(currentScale);
  });

  sprite.popup = popup;
}
