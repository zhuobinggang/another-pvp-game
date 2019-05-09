var LeisureState = /** @class */ (function () {
    function LeisureState(context) {
        this.context = context;
    }
    LeisureState.prototype.onClick = function () {
        this.context.state = this.context.shrinkState;
        this.context.state.init ? this.context.state.init() : null;
    };
    return LeisureState;
}());
var ShrinkState = /** @class */ (function () {
    function ShrinkState(context) {
        this.context = context;
    }
    ShrinkState.prototype.init = function () {
        this.totalDistance = this.context.minScale - this.context.currentScale;
        this.totalFrames = this.context.interval * 60;
    };
    ShrinkState.prototype.update = function (frames) {
        var distance = frames / this.totalFrames * this.totalDistance;
        var nextScale = this.context.currentScale + distance;
        //if ((this.context.minScale - this.context.currentScale) * (this.context.minScale - nextScale) < 0) {
        if (this.context.currentScale < this.context.minScale) {
            this.context.currentScale = this.context.minScale;
            this.context.state = this.context.expandState;
            this.context.state.init ? this.context.state.init() : null;
        }
        else {
            this.context.currentScale = nextScale;
        }
        this.context.btn.scale.x = this.context.currentScale;
        this.context.btn.scale.y = this.context.currentScale;
    };
    return ShrinkState;
}());
var ExpandState = /** @class */ (function () {
    function ExpandState(context) {
        this.context = context;
    }
    ExpandState.prototype.init = function () {
        this.totalDistance = this.context.initialScale - this.context.currentScale;
        this.totalFrames = this.context.interval * 60;
    };
    ExpandState.prototype.update = function (frames) {
        var distance = frames / this.totalFrames * this.totalDistance;
        var nextScale = this.context.currentScale + distance;
        //if ((this.context.initialScale - this.context.currentScale) * (this.context.initialScale - nextScale) < 0) {
        if (this.context.currentScale > this.context.initialScale) {
            this.context.currentScale = this.context.initialScale;
            this.context.state = this.context.leisureState;
            this.context.state.init ? this.context.state.init() : null;
        }
        else {
            this.context.currentScale = nextScale;
        }
        this.context.btn.scale.x = this.context.currentScale;
        this.context.btn.scale.y = this.context.currentScale;
    };
    return ExpandState;
}());
var Button = /** @class */ (function () {
    function Button(btn, minScale, interval) {
        this.btn = btn;
        this.minScale = minScale ? minScale : constants.BUTTON_MIN_SCALE;
        this.interval = interval ? interval : constants.BUTTON_INTERVAL;
        this.initialScale = btn.scale.x;
        this.currentScale = this.initialScale;
        this.leisureState = new LeisureState(this);
        this.shrinkState = new ShrinkState(this);
        this.expandState = new ExpandState(this);
        this.state = this.leisureState;
    }
    Button.prototype.mount = function () {
        var me = this;
        var sprite = me.btn;
        sprite.interactive = true;
        (function () {
            sprite.pointDownListners = [];
            sprite.addPointDownListner = function (cb) {
                sprite.pointDownListners.push(cb);
            };
            sprite.on('pointerdown', function () {
                sprite.pointDownListners.forEach(function (cb) {
                    cb();
                });
            });
        })();
        /*
      sprite.on('pointerdown', () => {
        me.state.onClick ? me.state.onClick() : null;
      });
          */
        sprite.addPointDownListner(function () {
            me.state.onClick ? me.state.onClick() : null;
        });
        PIXI.ticker.shared.add(function (elapsedFrame) {
            me.state.update ? me.state.update(elapsedFrame) : null;
        });
    };
    return Button;
}());
function addButtonComponent(sprite, scale, interval) {
    var btn = new Button(sprite, scale, interval);
    btn.mount();
}
