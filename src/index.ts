import entries from 'object.entries';
import fromEntries from 'object.fromentries';
import WeakSet from 'core-js/es6/weak-set';
import WeakMap from 'core-js/es6/weak-map';
import defaultIsMergeableObject from 'is-mergeable-object';

const moduleCollection: WeakMap<any, {module: Module, moduleKey: string}> = new WeakMap();
const hashTagMap: WeakMap<any, UserTag> = new WeakMap();
const descriptorSet = new WeakSet();
let withMerging = false;
let flushQueue: {key: any, moduleKey: string}[] = [];
let flushing = false;
let storage = window.localStorage;
let rootKey = 'coffee';

const defaultArrayMerge = (target: any, source: any) => source;

const mergeObject = (target: any, source: any, options: any) => {
  Object.keys(source).forEach(key => {
    if (!options.isMergeableObject(source[key]) || !target[key]) {
      target[key] = source[key];
    } else {
      target[key] = merge(target[key], source[key], options);
    }
  })
  return target
};
const merge = (target: any, source: any, options?: any) => {
  options = options || {}
  options.arrayMerge = options.arrayMerge || defaultArrayMerge
  options.isMergeableObject = options.isMergeableObject || defaultIsMergeableObject

  const sourceIsArray = Array.isArray(source)
  const targetIsArray = Array.isArray(target)
  const sourceAndTargetTypesMatch = sourceIsArray === targetIsArray

  if (!sourceAndTargetTypesMatch) {
    return source;
  } else if (sourceIsArray) {
    return options.arrayMerge(target, source, options)
  } else {
    return mergeObject(target, source, options)
  }
};

const parseJSON = (str: string) => {
  try {
    return str ? JSON.parse(str) : undefined;
  } catch (e) {}
  return undefined;
};
const normalizeNamespace = (path: string[]) => `${path.join('/')}/`;

const getDataFromStorage = async (module: Module, storagePath: string[] = []) => {
  const moduleKey = normalizeNamespace(storagePath);
  const {_children} = module;
  const data = parseJSON(storage.getItem(moduleKey) || '{}') || {};
  const children = entries(_children);
  if (!children.length) {
    return data;
  }
  const childModules = await Promise.all(
    children.map(async ([childKey, child]: [string, any]) => {
      return [childKey, await getDataFromStorage(child, storagePath.concat(childKey))];
    })
  );
  return {
    ...data,
    ...fromEntries(childModules),
  }
};

const descriptorFactory = (userTag: UserTag) => (target: any, name: string) => {
  if (!hashTagMap.has(target)) {
    hashTagMap.set(target, userTag);
  } else {
    let tag = hashTagMap.get(target)!;
    tag = tag | userTag; // 启用黑白名单标志
    if (tag & UserTag.WHITE && tag & UserTag.BLACK) {
      throw new Error('can\'t set blacklist and whitelist at the same time in one module');
    }
  }
  let value = target[name];
  return {
    enumerable: true,
    configurable: true,
    get: function() {
      const getter = (Object.getOwnPropertyDescriptor(target, name)! || {}).get;
      if (getter && !descriptorSet.has(getter)) {
        descriptorSet.add(getter); // 放入Set，setState时判断是否需要存入storage
      }
      return value;
    },
    set: function(newVal: any) {
      value = newVal;
      if (!withMerging) {
        const getter = (Object.getOwnPropertyDescriptor(target, name) || {}).get;
        if (getter && descriptorSet.has(getter)) {
          const moduleKey = (moduleCollection.get(target) || {}).moduleKey;
          if (moduleKey) {
            if (flushQueue.every(a => a.key !== target)) {
              flushQueue.push({key: target, moduleKey});
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

const flush = () => {
  if (!flushing) {
    flushing = true;
    setTimeout(() => {
      let shiftItem: {key: any, moduleKey: string} | undefined;
      while (shiftItem = flushQueue.shift()) {
        const state = shiftItem.key;
        const pureState = fromEntries(entries(state).filter(([key]: [string]) => {
          const getter = (Object.getOwnPropertyDescriptor(state, key) || {}).get;
          return getter && descriptorSet.has(getter);
        }));
        storage.setItem(shiftItem.moduleKey, JSON.stringify(pureState));
      }
      flushing = false;
    });
  }
};

enum UserTag {
  WHITE = 1,
  BLACK = 2,
};

export const shouldWrite = descriptorFactory(UserTag.WHITE);

/** 解析各module，moduleKey和state的关系，并存入moduleCollection*/
export const parseModule = (module: Module, storagePath: string[]) => {
  const moduleKey = normalizeNamespace(storagePath);
  moduleCollection.set(module.state, {module, moduleKey});
  module.forEachChild((child: Module, childKey: string) => {
    parseModule(child, storagePath.concat(childKey));
  });
};

export const createStatePlugin = (option: PluginOption) => {
  const {
    key,
    intercept,
    beforeCreate = [],
    afterCreate = [],
  } = option;
  key && (rootKey = key);
  if (option.storage) {
    storage = option.storage;
  }
  return function(store: Store) {
    beforeCreate.forEach(fn => {
      fn.call(store, store);
    });
    parseModule(store._modules.root, [rootKey]);
    withMerging = true;
    const init = getDataFromStorage(store._modules.root, [rootKey]).then((savedState: object) => {
      store.replaceState(merge(store.state, savedState));
      withMerging = false;
    }).catch(() => {}).then(() => {
      afterCreate.forEach(fn => {
        fn.call(store, store);
      });
    });
    intercept(init);
  };
};