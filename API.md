## Button component

```html
//import `js/button.js` in your html entry file.
<script src="js/button.js"></script>
//Create a sprite
const closeBtn = new PIXI.Sprite(res[constants.START_SCENE_PATH.CLOSE_BTN].texture); 
//Call the function
//0.8 is the min scale when the btn was clicked then it will first shrink to the min scale then rebound
addButtonComponent(closeBtn, 0.8);
//If you want to do something when the btn is clicked
closeBtn.addPointDownListner(() => {
  console.log('clicked')
})
```



