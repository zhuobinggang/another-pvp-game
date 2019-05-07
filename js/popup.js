function addPopupComponent(sprite, interval) {
    var initialScale = sprite.scale.x;
    var currentScale = sprite.scale.x;
    var tarScale = -1;
    var popup = {};
    interval ? null : interval = constants.POPUPS.DEFAULT_INTERVAL;
    var totalFrames = interval * 60;
    var totalDistance = -1;
    var openCb = [];
    var closeCb = [];
    popup.open = function (cb) {
        sprite.visible = true;
        currentScale = 0;
        tarScale = initialScale;
        totalDistance = tarScale - currentScale;
        cb ? openCb.push(cb) : null;
    };
    popup.close = function (cb) {
        //sprite.visible = false;
        tarScale = 0;
        totalDistance = tarScale - currentScale;
        cb ? closeCb.push(cb) : null;
        closeCb.push(function () {
            sprite.visible = false;
        });
    };
    PIXI.ticker.shared.add(function (frames) {
        //frames / totalFrames == distance / totalDistance;
        if (tarScale == -1 || totalDistance == -1) {
            return;
        }
        if (currentScale == tarScale) {
            return;
        }
        var distance = totalDistance * frames / totalFrames;
        var nextScale = currentScale + distance;
        if ((tarScale - currentScale) * (tarScale - nextScale) < 0) {
            currentScale = tarScale;
            //Check if should callback
            if (nextScale < currentScale) {
                console.log('call closeCbs');
                closeCb.forEach(function (cb) {
                    cb();
                });
                closeCb = [];
            }
            else {
                console.log('call openCbs');
                openCb.forEach(function (cb) {
                    cb();
                });
                openCb = [];
            }
        }
        else {
            currentScale = nextScale;
        }
        sprite.scale.set(currentScale);
    });
    sprite.popup = popup;
}
