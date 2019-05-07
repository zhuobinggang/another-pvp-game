## how to use

首先在当前目录启动 `http-server`

访问 `http://localhost:8080`

### 前端测试入口

访问

`http://localhost:8080/game.html`

打开控制台输入init()

### 单独测试多人游戏场景

访问 `http://localhost:8080/test_multigame.html`

### 后端测试入口

进入backend文件夹, yarn install安装后端依赖 `node server.js` 启动服务器

访问

`http://localhost:8080/test_sio_server.html`

打开控制台输入connect(), 如果返回1000表明请求成功


## 查看文档

进入document文件夹


## 一些测试页面

1. 测试box2d球跟墙壁完全弹性碰撞: `http://localhost:8080/test_plankjs.html`

