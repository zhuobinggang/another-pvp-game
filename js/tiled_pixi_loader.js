
/*
function loadJson(url) {
        return new Promise((resolve, reject) => {
            PIXI.loader.add(url).load((_, resource) => {
                resolve(resource[url].data)
            })
        })
}
*/

function loadJson(url) {
	return new Promise((resolve, reject) => {
		const httpRequest = new XMLHttpRequest();
		httpRequest.onreadystatechange = () => {
			if (httpRequest.readyState === XMLHttpRequest.DONE) {
				if (httpRequest.status === 200) {
					resolve(JSON.parse(httpRequest.responseText))
					//alert(httpRequest.responseText);       
				} else {
					//alert('There was a problem with the request.');       
					reject('Ajax load json failed!')
				}
			}
		};
		httpRequest.open('GET', url);
		httpRequest.send();
	})
}

class TiledMap {
	constructor(obj) {
		this.height = null
		this.width = null
		this.tileheight = null
		this.tilewidth = null
		this.tilesets = null //Type of TileSet
		this.layers = null
		this.tileSetUrlPrefix = null //The url prefix for loading tilesets

		Object.assign(this, obj)
	}
}

class TileSet {
	constructor(rawData) {
		this.columns = null
		this.image = null //The url
		this.imageheight = null
		this.imagewidth = null
		this.name = null
		this.tilecount = null
		this.tileheight = null
		this.tilewidth = null
		this.tiles = null //Type of Tile


		this.urlPrefix = null //For loading img texture

		Object.assign(this, rawData)
	}
}

class Tile {
	constructor() {
		this.id = null
		this.animation = null
		this.properties = null

		this.sprite = null //
		this.tileset = null //The tileset reference

    this.layer = null; //Set when analyze
    this.pos = {x: -1, y: -1}; //Set when analyze
	}
}

class Layer {
	constructor() {
		this.data = null
		this.height = null
		this.width = null
		this.id = null
		this.name = null
		this.visible = null
		this.type = null //'tilelayer' or 'objectgroup'
		this.objects = null //Only the objectgroup has this property

		this.tiles = null //Need to be filled later
	}
}

class ObjectType {
	constructor() {
		this.name = null
		this.id = null
		this.x = null
		this.y = null
		this.visible = null
	}
}

//TODO: Test if the map json and the tileset json are not in the same directory
function loadTileSet(prefix) {
	return (rawData) => {
		const url = prefix + rawData.source
		return loadJson(url)
			.then(tileSet => {
				const ts = new TileSet(tileSet)
				//console.log(ts)
				ts.urlPrefix = urlPrefix(url)
				return ts
			})
	}

}

//From tilesets get the texture and init the Tile
function toTile(index) {
	//TODO: Need the reference of tilesets
}

function initTiles(dataArray) {
	const tiles = dataArray.map(toTile)
	return tiles
}

function initLayer(rawData, tilesets) {
	const layer = new Layer()
	//layer.tiles = initTiles(rawData.data, tilesets)
	return layer
}

function urlPrefix(url) {
	const urlArray = url.split('/')
	let result = ''
	for (let i = 0; i < urlArray.length - 1; i++) {
		result += urlArray[i] + '/'
	}
	return result
}

function calFrame(id, columns, width, height) {
	const x = (id % columns) * width
	const y = Math.floor((id / columns)) * height
	const frame = new PIXI.Rectangle(x, y, width, height)
	return frame
}

function loadTiledMap(url) {
	return loadJson(url)
		.then(data => { //Init tilemap class
			return new TiledMap(data)
		})
		.then(tiledMap => {//Init tilemap.tilesets
			tiledMap.tileSetUrlPrefix = urlPrefix(url)
			const tilesetLoaders = tiledMap.tilesets.map(loadTileSet(tiledMap.tileSetUrlPrefix))
			return Promise.all(tilesetLoaders)
				.then(tilesets => {
					tilesets.forEach((ts, index) => {
						tiledMap.tilesets[index] = Object.assign(tiledMap.tilesets[index], ts)
					})
					//console.log(tiledMap.tilesets)
					return tiledMap
				})
		})
		.then(tiledMap => {//Load texture then set for tileset
			const imgUrls = tiledMap.tilesets.map(ts => {
				ts.imgUrl = ts.urlPrefix + ts.image
				return ts.imgUrl
			})
			//console.log(imgUrls)
			//load img textures
			return new Promise((resolve, reject) => {
				PIXI.loader.add(imgUrls).load((_, res) => {
					//console.log(res)
					tiledMap.tilesets.forEach(ts => {
						const texture = res[ts.imgUrl]
						if (null == texture) {
							console.warn("Load texture failed, the path is: " + ts.imgUrl)
						}
						ts.texture = texture
					})
					//console.log(tiledMap.tilesets)
					resolve(tiledMap)
				})
			})
		})
		.then(tiledMap => {//Analyse layers
			//1. Every tileset has its own tile height and width
			//2. Use the map.tileset.firstgid to cal where the tile is in
			const layers = tiledMap.layers.map((layer) => {
				const data = layer.data
				//const container = new PIXI.Container()
				let result = new Layer()
				result = Object.assign(result, layer)
				result.tiles = []

				if (data == null) {
					console.warn('Not support type: ', layer.type)
					return result
				}


				//console.log(tiledMap.tilesets)
				const customTiles = {} //Store

				data.forEach((tileNumber, index) => {
					if (tileNumber == 0) { //Continue
						return true
					}


					//Get tileset
					let tileset = null
					for (let i = tiledMap.tilesets.length - 1; i >= 0; i--) {
						if (tileNumber >= tiledMap.tilesets[i].firstgid) {
							tileset = tiledMap.tilesets[i]
							break
						}
					}

					const baseTexture = tileset.texture.texture

					const offset = tileNumber - tileset.firstgid

					//container.addChild(sprite)
					let tile = new Tile()
					tile.id = offset
					//tile.tileset = tileset
          //
          tile.pos.x = index % tiledMap.width;
          tile.pos.y = Math.floor(index / tiledMap.width);
          tile.layer = layer;

					//console.log(tileset)

					if (tileset.tiles != null) {
						const customTile = tileset.tiles.find(t => {
							return t.id == tile.id
						})
						if (customTile != null) {
							tile.customValue = {}
							//Object.assign(tile, customTile)
							//console.log('custom tile', tile)
              if(customTile.properties){
  							customTile.properties.forEach(p => {
									if(customTiles[p.name] == null){
										customTiles[p.name] = []
									}
									tile.customValue[p.name] = p.value
									customTiles[p.name].push(tile)
							  })
              }else{
                console.log('Not support tileset.tiles')
              }
						}
					}



					let sprite = null
					if (tile.animation) {//Set animated sprite
						//TODO: Currently can not use the property of animation.duration
						const textures = tile.animation.map(a => {
							const frame = calFrame(a.tileid, tileset.columns, tileset.tilewidth, tileset.tileheight)
							return new PIXI.Texture(baseTexture, frame)
						})
						sprite = new PIXI.extras.AnimatedSprite(textures)
						sprite.animationSpeed = 0.05
						sprite.play()
						//window.animated = sprite
					} else {//Set normal sprite
						const frame = calFrame(offset, tileset.columns, tileset.tilewidth, tileset.tileheight)
						sprite = new PIXI.Sprite(new PIXI.Texture(baseTexture, frame))
					}
					sprite.x = index % tiledMap.width * tiledMap.tilewidth
					sprite.y = Math.floor(index / tiledMap.width) * tiledMap.tileheight

					//Fix the anchor to match tiled
					//sprite.anchor.y = 0
					//Fix position of tiles which are higher than the global tile height
					sprite.y -= sprite.height - tiledMap.tileheight

          //Set anchor to centre
          sprite.anchor.set(0.5)
          sprite.x += sprite.width / 2
          sprite.y += sprite.height / 2
					

					tile.sprite = sprite
					sprite.tile = tile


					result.tiles.push(tile)
				})

				//tiledMap.customTiles = customTiles
        if(tiledMap.customTiles == null){
          tiledMap.customTiles = {}; 
        }
				tiledMap.customTiles = Object.assign(tiledMap.customTiles, customTiles);
        //console.log(customTiles)

				return result

			})
			//console.log(containers)
			tiledMap.layers = layers
			return tiledMap
		})
}

function tmxToContainer(tiledMap){
	const result = new PIXI.Container();
	const containers = tiledMap.layers.map(layer => {
		const c = new PIXI.Container();
		layer.tiles.forEach(t => {
			c.addChild(t.sprite);
		})
		return c;
	})
	containers.forEach(c => {
		result.addChild(c)
	})
  return result;
}

function show(tiledMap, app) {
  app.stage.addChild(tmxToContainer(tiledMap));
  app.tiledMap = tiledMap;
	return tiledMap
}

//Because the anchor is at the left-bottom corner of the sprite in tiled by default, so need to fix the position
function fixPosition() {

}


function load(url) {
	return loadTiledMap(url)
		.then(show)
		.then(tiledMap => {
			//console.log(tiledMap)
			return tiledMap
			//app.stage.position.y += tiledMap.tileheight
		})
}


function demo(url){
	const demo = new PIXI.Application(window.screen.width, window.screen.height, {backgroundColor : 0x1099bb});
	document.body.appendChild(demo.view);
  window.demo = demo;
  return loadTiledMap(url).then(tm => {
    show(tm, demo);
    return tm;
  })
}
