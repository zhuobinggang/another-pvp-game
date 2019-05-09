

declare const PIXI: any;
declare const constants: any;

interface ButtonState{
  context: any;
  onClick?: () => void;
  update?: (number) => void;
  init?: () => void;
}

interface ButtonSprite{
  scale: {x: number,y: number};
  interactive: boolean;
  on: (name : string,cb : () => void) => void; 
  pointDownListners: any;
  addPointDownListner: (cb : () => void) => void;
}


interface Component{
  mount: () => void;
}


class LeisureState implements ButtonState{
  context : any;
  constructor(context: any){
    this.context = context
  }
  onClick(){
    this.context.state = this.context.shrinkState;
    this.context.state.init ? this.context.state.init() : null;
  }
}


class ShrinkState implements ButtonState{
  context : any;
  private totalDistance: number;
  private totalFrames: number;
  constructor(context: any){
    this.context = context
  }
  init(){
    this.totalDistance = this.context.minScale - this.context.currentScale
    this.totalFrames = this.context.interval * 60
  }
  update(frames: number){
    const distance : number =  frames / this.totalFrames * this.totalDistance;
    const nextScale : number = this.context.currentScale + distance;
    //if((this.context.minScale - this.context.currentScale) * (this.context.minScale - nextScale) < 0){
    if(this.context.currentScale < this.context.minScale){
      this.context.currentScale = this.context.minScale;
      this.context.state = this.context.expandState;
      this.context.state.init ? this.context.state.init() : null;
    }else{
      this.context.currentScale = nextScale;
    }
    this.context.btn.scale.x = this.context.currentScale
    this.context.btn.scale.y = this.context.currentScale
  }
}


class ExpandState implements ButtonState{
  context : any;
  private totalDistance: number;
  private totalFrames: number;
  constructor(context: any){
    this.context = context;
  }
  init(){
    this.totalDistance = this.context.initialScale - this.context.currentScale
    this.totalFrames = this.context.interval * 60
  }
  update(frames: number){
    const distance : number =  frames / this.totalFrames * this.totalDistance;
    const nextScale : number = this.context.currentScale + distance;
    //if((this.context.initialScale - this.context.currentScale) * (this.context.initialScale - nextScale) < 0){
    if(this.context.currentScale > this.context.initialScale){
      this.context.currentScale = this.context.initialScale;
      this.context.state = this.context.leisureState;
      this.context.state.init ? this.context.state.init() : null;
    }else{
      this.context.currentScale = nextScale;
    }
    this.context.btn.scale.x = this.context.currentScale
    this.context.btn.scale.y = this.context.currentScale
  }
}

class Button implements Component{
  private btn: ButtonSprite;
  private state: ButtonState;
  private expandState: ButtonState;
  private leisureState: ButtonState;
  private shrinkState: ButtonState;
  private initialScale: number;
  private minScale: number;
  private currentScale: number;
  private interval: number;
  constructor(btn: ButtonSprite, minScale?: number, interval?: number){
    this.btn = btn
    this.minScale =  minScale? minScale : constants.BUTTON_MIN_SCALE;
    this.interval = interval? interval : constants.BUTTON_INTERVAL;
    this.initialScale = btn.scale.x;
    this.currentScale = this.initialScale;
    this.leisureState = new LeisureState(this)
    this.shrinkState = new ShrinkState(this)
    this.expandState = new ExpandState(this)
    this.state = this.leisureState
  }

  mount(){
    const me = this;
    const sprite : ButtonSprite = me.btn;
    sprite.interactive = true;
    (() => {
      sprite.pointDownListners = []
      sprite.addPointDownListner = (cb) => {
        sprite.pointDownListners.push(cb)
      }
      sprite.on('pointerdown', () => {
        sprite.pointDownListners.forEach(cb => {
          cb();
        })
      })
    })();
      /*
    sprite.on('pointerdown', () => {
      me.state.onClick ? me.state.onClick() : null;
    });
        */
    sprite.addPointDownListner(() => {
      me.state.onClick ? me.state.onClick() : null;
    });
    PIXI.ticker.shared.add((elapsedFrame) => {
      me.state.update ? me.state.update(elapsedFrame) : null;
    })
  }
}


function addButtonComponent(sprite: any, scale, interval) {
  const btn: Component = new Button(sprite, scale, interval)
  btn.mount()
}
