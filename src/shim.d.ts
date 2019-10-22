interface PluginOption {
  intercept: (arg: Promise<void>) => void,
  key?: string,
  supportRegister?: boolean,
  beforeCreate?: ((arg: Store) => void)[],
  afterCreate?: ((args: Store) => void)[],
  storage?: Storage,
}

type Store = any;
type Module = any;

declare module 'object.entries';
declare module 'core-js/es6/weak-set';
declare module 'core-js/es6/weak-map';
declare module 'object.fromentries';