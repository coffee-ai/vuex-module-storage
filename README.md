# vuex-module-storage

依据Vuex的module来存储数据到storage

## install

```
npm install vuex-module-storage -S
```

## use

加载vuex插件

**store.js**
```javascript
import {createStatePlugin} from 'vuex-module-storage';
const plugins = [];
plugins.push(createStatePlugin({
  key: 'rootKey', // 根节点的key
  intercept: function(init) {
    router.beforeEach((from, to, next) => {
      init.then(next);
    });
  }
}));
export default new Vuex.Store({
  ...
  plugins,
})
```

给需要存储的state属性添加到白名单，在state.someState改变时，就能保存到storage

**module.js**
```javascript
import {shouldWrite} from 'vuex-module-storage';
const module = {
  ...
  state: {
    @shouldWrite
    someState: {}
  },
}
```