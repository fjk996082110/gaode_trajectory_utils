import '@amap/amap-jsapi-types'

export interface InitMapParams extends AMap.MapOptions {
  /** 容器ID */
  elId: string
}

export interface Markers {
  id: string
  position: [number, number]
  type: 'online' | 'charging' | 'stop' // 类型： 在线、充电
  clickCallBack?: (params: any) => void
  showCarId: boolean
}
