import {Store} from 'vuex';
interface PluginOption {
  intercept: (arg: Promise<void>) => void,
  key?: string,
  supportRegister?: boolean,
  beforeCreate?: ((arg: Store<any>) => void)[],
  afterCreate?: ((args: Store<any>) => void)[],
  storage?: Storage,
}
export declare const shouldWrite: (target: any, name: string) => {
  enumerable: boolean,
  configurable: boolean,
  get: () => any,
  set: (newVal: any) => void,
};
export declare const parseModule: (module: any, storagePath: string[]) => void;
export declare const createStatePlugin: (option: PluginOption) => (store: Store<any>) => void;