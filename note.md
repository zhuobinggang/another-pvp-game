1. The `PIXI.loader` use the relative path like that in src tag in html: omit the prefix of `./`
2. The common method of build textures, from the project of `pixi-tiled`.

```
this.baseTexture = PIXI.Texture.fromImage(route + '/' + tileSet.image.source, false, PIXI.SCALE_MODES.NEAREST);
this.textures.push(new PIXI.Texture(this.baseTexture, new PIXI.Rectangle(x, y, this.tileWidth, this.tileHeight)));
```

