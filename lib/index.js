import _defineProperty from '@babel/runtime/helpers/defineProperty';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import _slicedToArray from '@babel/runtime/helpers/slicedToArray';
import _asyncToGenerator from '@babel/runtime/helpers/asyncToGenerator';
import entries from 'object.entries';
import fromEntries from 'object.fromentries';
import WeakSet from 'core-js/es6/weak-set';
import WeakMap from 'core-js/es6/weak-map';
import defaultIsMergeableObject from 'is-mergeable-object';

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
var moduleCollection = new WeakMap();
var hashTagMap = new WeakMap();
var descriptorSet = new WeakSet();
var withMerging = false;
var flushQueue = [];
var flushing = false;
var storage = window.localStorage;
var rootKey = 'coffee';

var defaultArrayMerge = function defaultArrayMerge(target, source) {
  return source;
};

var mergeObject = function mergeObject(target, source, options) {
  Object.keys(source).forEach(function (key) {
    if (!options.isMergeableObject(source[key]) || !target[key]) {
      target[key] = source[key];
    } else {
      target[key] = merge(target[key], source[key], options);
    }
  });
  return target;
};

var merge = function merge(target, source, options) {
  options = options || {};
  options.arrayMerge = options.arrayMerge || defaultArrayMerge;
  options.isMergeableObject = options.isMergeableObject || defaultIsMergeableObject;
  var sourceIsArray = Array.isArray(source);
  var targetIsArray = Array.isArray(target);
  var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;

  if (!sourceAndTargetTypesMatch) {
    return source;
  } else if (sourceIsArray) {
    return options.arrayMerge(target, source, options);
  } else {
    return mergeObject(target, source, options);
  }
};

var parseJSON = function parseJSON(str) {
  try {
    return str ? JSON.parse(str) : undefined;
  } catch (e) {}

  return undefined;
};

var normalizeNamespace = function normalizeNamespace(path) {
  return "".concat(path.join('/'), "/");
};

var getDataFromStorage =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator(
  /*#__PURE__*/
  _regeneratorRuntime.mark(function _callee2(module) {
    var storagePath,
        moduleKey,
        _children,
        data,
        children,
        childModules,
        _args2 = arguments;

    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            storagePath = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : [];
            moduleKey = normalizeNamespace(storagePath);
            _children = module._children;
            data = parseJSON(storage.getItem(moduleKey) || '{}') || {};
            children = entries(_children);

            if (children.length) {
              _context2.next = 7;
              break;
            }

            return _context2.abrupt("return", data);

          case 7:
            _context2.next = 9;
            return Promise.all(children.map(
            /*#__PURE__*/
            function () {
              var _ref3 = _asyncToGenerator(
              /*#__PURE__*/
              _regeneratorRuntime.mark(function _callee(_ref2) {
                var _ref4, childKey, child;

                return _regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _ref4 = _slicedToArray(_ref2, 2), childKey = _ref4[0], child = _ref4[1];
                        _context.t0 = childKey;
                        _context.next = 4;
                        return getDataFromStorage(child, storagePath.concat(childKey));

                      case 4:
                        _context.t1 = _context.sent;
                        return _context.abrupt("return", [_context.t0, _context.t1]);

                      case 6:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));

              return function (_x2) {
                return _ref3.apply(this, arguments);
              };
            }()));

          case 9:
            childModules = _context2.sent;
            return _context2.abrupt("return", _objectSpread({}, data, {}, fromEntries(childModules)));

          case 11:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  return function getDataFromStorage(_x) {
    return _ref.apply(this, arguments);
  };
}();

var descriptorFactory = function descriptorFactory(userTag) {
  return function (target, name) {
    if (!hashTagMap.has(target)) {
      hashTagMap.set(target, userTag);
    } else {
      var tag = hashTagMap.get(target);
      tag = tag | userTag; // 启用黑白名单标志

      if (tag & UserTag.WHITE && tag & UserTag.BLACK) {
        throw new Error('can\'t set blacklist and whitelist at the same time in one module');
      }
    }

    var value = target[name];
    return {
      enumerable: true,
      configurable: true,
      get: function get() {
        var getter = (Object.getOwnPropertyDescriptor(target, name) || {}).get;

        if (getter && !descriptorSet.has(getter)) {
          descriptorSet.add(getter); // 放入Set，setState时判断是否需要存入storage
        }

        return value;
      },
      set: function set(newVal) {
        value = newVal;

        if (!withMerging) {
          var getter = (Object.getOwnPropertyDescriptor(target, name) || {}).get;

          if (getter && descriptorSet.has(getter)) {
            var moduleKey = (moduleCollection.get(target) || {}).moduleKey;

            if (moduleKey) {
              if (flushQueue.every(function (a) {
                return a.key !== target;
              })) {
                flushQueue.push({
                  key: target,
                  moduleKey: moduleKey
                });

                if (!flushing) {
                  flush();
                }
              }
            }
          }
        }
      }
    };
  };
};

var flush = function flush() {
  if (!flushing) {
    flushing = true;
    setTimeout(function () {
      var shiftItem;

      var _loop = function _loop() {
        var state = shiftItem.key;
        var pureState = fromEntries(entries(state).filter(function (_ref5) {
          var _ref6 = _slicedToArray(_ref5, 1),
              key = _ref6[0];

          var getter = (Object.getOwnPropertyDescriptor(state, key) || {}).get;
          return getter && descriptorSet.has(getter);
        }));
        storage.setItem(shiftItem.moduleKey, JSON.stringify(pureState));
      };

      while (shiftItem = flushQueue.shift()) {
        _loop();
      }

      flushing = false;
    });
  }
};

var UserTag;

(function (UserTag) {
  UserTag[UserTag["WHITE"] = 1] = "WHITE";
  UserTag[UserTag["BLACK"] = 2] = "BLACK";
})(UserTag || (UserTag = {}));
var shouldWrite = descriptorFactory(UserTag.WHITE);
/** 解析各module，moduleKey和state的关系，并存入moduleCollection*/

var parseModule = function parseModule(module, storagePath) {
  var moduleKey = normalizeNamespace(storagePath);
  moduleCollection.set(module.state, {
    module: module,
    moduleKey: moduleKey
  });
  module.forEachChild(function (child, childKey) {
    parseModule(child, storagePath.concat(childKey));
  });
};
var createStatePlugin = function createStatePlugin(option) {
  var key = option.key,
      intercept = option.intercept,
      _option$beforeCreate = option.beforeCreate,
      beforeCreate = _option$beforeCreate === void 0 ? [] : _option$beforeCreate,
      _option$afterCreate = option.afterCreate,
      afterCreate = _option$afterCreate === void 0 ? [] : _option$afterCreate;
  key && (rootKey = key);

  if (option.storage) {
    storage = option.storage;
  }

  return function (store) {
    beforeCreate.forEach(function (fn) {
      fn.call(store, store);
    });
    parseModule(store._modules.root, [rootKey]);
    withMerging = true;
    var init = getDataFromStorage(store._modules.root, [rootKey]).then(function (savedState) {
      store.replaceState(merge(store.state, savedState));
      withMerging = false;
    })["catch"](function () {}).then(function () {
      afterCreate.forEach(function (fn) {
        fn.call(store, store);
      });
    });
    intercept(init);
  };
};

export { createStatePlugin, parseModule, shouldWrite };
