//Author: kobako

((factory) => {
  if(module != null && module.exports != null){
    module.exports = factory();
  }else if(window != null){
    window.Ticker = factory();
  }else{
    console.error('Unkonwn enviroment, please import the lib by yourself');
  }
})(() => { //Factory

const STATES = {
  STARTED: 0,
  PAUSED: 1,
  STOPED: 2,
}


class Ticker{

  constructor(interval){
    this.interval = interval;
    this.listeners = [];
    this.loop = null;
    this.state = STATES.STOPED;
  }

  add(fn){
    this.listeners.push(fn);
    return this;
  }

  remove(fn){
    this.listeners = this.listeners.filter(listener => {
      return listener != fn;
    });
    return this;
  }

  start(){
    if(this.state == STATES.STARTED){
      console.warn('Ticker is already started!');
    }else{
      this.loop = setInterval(() => {
        this.listeners.forEach(cb => {
          cb();
        });
      }, this.interval);
      this.state = STATES.STARTED;
    }
    return this;
  }

  pause(){
    if(this.state == STATES.STOPED || this.state == STATES.PAUSED){
      console.warn('Why do you try to pause a inactive ticker?');
    }else{
      clearInterval(this.loop);
      this.state = STATES.PAUSED;
    }
    return this;
  }

  stop(){
    if(this.state == STATES.STOPED){
      console.warn('Why do you try to stop a stoped ticker?');
    }else{
      this.listeners = [];
      this.state = STATES.STOPED;
    }
    
    return this;
  }

}

return Ticker;

});

