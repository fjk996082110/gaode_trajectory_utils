import { h, createApp } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { type InitMapParams, type Markers } from './mapLoaderInterface'
import infoWindow from './infoWindow.vue'

export default class MapLoader {
  private mapLoader: any
  private trafficLayer: any // 实时交通图层
  private labelMarkerMap: Map<string, any> = new Map() // 标记集合
  private infoWindow: any // 信息窗体
  private geocoder: any // 地理编码
  private autoComplete: any
  private defaultMarker: any // 默认点标记
  private overviewPolyline: any // 全览轨迹线
  private singleMarker: any // 单个点标记
  private cluster: any = null
  private clusterData: Array<{ lnglat: [number, number]; data: Markers }> = []

  constructor() {}
  // 是否已经加载地图
  private hasInitMap() {
    if (!this.mapLoader) {
      console.error('mapLoader is not initialized')
      return
    }
  }
  // 初始化地图
  public initMap(params: InitMapParams, completeFn?: (type: string) => void) {
    if (!params.elId) {
      console.error('elId is required')
      return
    }
    ;(window as any)._AMapSecurityConfig = {
      securityJsCode: import.meta.env.VITE_AMAP_JS_SECURITY_KEY,
    }
    AMapLoader.load({
      key: import.meta.env.VITE_AMAP_JS_KEY,
      version: '2.0',
    })
      .then((AMap) => {
        this.mapLoader = new AMap.Map(params.elId, {
          // 设置地图容器id
          viewMode: '2D', // 是否为3D地图模式
          zoom: params.zoom ?? 11, // 初始化地图级别
          center: params.center || [116.397428, 39.90923], // 初始化地图中心点位置
        })
        AMap.plugin(
          [
            'AMap.Scale',
            'AMap.ToolBar',
            'AMap.Geocoder',
            'AMap.AutoComplete',
            'AMap.MoveAnimation',
            'AMap.MarkerCluster',
          ],
          () => {
            const scale = new AMap.Scale({
              position: {
                right: '20px',
                top: '85vh',
              },
            })
            this.mapLoader.addControl(scale)
            const toolBar = new AMap.ToolBar({
              //地图缩放插件
              position: {
                right: '25px',
                top: '190px',
              },
            })
            this.mapLoader.addControl(toolBar)
            this.geocoder = new AMap.Geocoder({
              city: '010', // city 指定进行编码查询的城市，支持传入城市名、adcode 和 citycode
            })
            const opt = {
              city: '010',
            }
            this.autoComplete = new AMap.Autocomplete(opt)
          },
        )
        this.mapLoader.on('complete', () => {
          completeFn && completeFn('complete')
        })
      })
      .catch((e) => {
        console.error(e)
      })
  }
  // 销毁地图
  public destroyMap() {
    this.hasInitMap()
    this.mapLoader.destroy()
  }
  // 加载实时交通图层
  public loadTrafficLayer() {
    this.hasInitMap()
    if (this.trafficLayer) {
      return
    }
    this.trafficLayer = new AMap.TileLayer.Traffic({
      autoRefresh: true, //是否自动刷新
      interval: 180, //刷新间隔，默认180s
    })
    this.mapLoader.add(this.trafficLayer)
  }
  // 移除实时交通图层
  public removeTrafficLayer() {
    this.hasInitMap()
    // this.mapLoader.remove(this.mapLoader.getLayers()[0])
    this.mapLoader.remove(this.trafficLayer)
    this.trafficLayer = null
  }
  // 创建/更新聚合（聚合时显示气泡，散开时显示自定义单点）
  private createOrUpdateCluster() {
    this.mapLoader &&
      this.mapLoader.plugin(['AMap.MarkerCluster'], () => {
        const options = {
          gridSize: 30,
          maxZoom: 18,
          // 非聚合点（散开状态）
          renderMarker: (ctx: any) => {
            const item: Markers = ctx.data[0].data
            // 设置固定大小的 icon，不随缩放变化
            ctx.marker.setIcon(
              new AMap.Icon({
                image:
                  item.type === 'online'
                    ? '/green.png'
                    : item.type === 'charging'
                      ? '/purple.png'
                      : '/blue.png',
                size: new AMap.Size(70, 80), // 固定像素大小
                imageSize: new AMap.Size(70, 80), // 避免拉伸
              }),
            )

            // 设置偏移，保证图标居中
            ctx.marker.setOffset(new AMap.Pixel(-35, -40))

            if (item.showCarId) {
              ctx.marker.setLabel({
                content: `<div style="
										font-size:14px;
										color:#fff;
										padding: 5px 8px;
										background:${
                      item.type === 'online'
                        ? 'rgba(36,152,48,0.80)'
                        : item.type === 'charging'
                          ? 'rgba(125,36,152,0.80)'
                          : 'rgba(57,90,192,0.80)'
                    };
										white-space:nowrap;
										text-align:center;
									">${item.id}</div>`,
                direction: 'bottom', // 在图标下方
                offset: new AMap.Pixel(0, -15),
              })
            } else {
              ctx.marker.setLabel(null) // 不展示车牌
            }

            // 单击回调
            ctx.marker.off('click') // 避免重复绑定
            ctx.marker.on('click', () => item.clickCallBack?.(item.id))
          },
          // 聚合点
          renderClusterMarker: (ctx: any) => {
            const count = ctx.count
            const div = document.createElement('div')
            const size = count > 100 ? 56 : count > 50 ? 48 : 40
            div.style.width = `${size}px`
            div.style.height = `${size}px`
            div.style.borderRadius = '50%'
            div.style.display = 'flex'
            div.style.alignItems = 'center'
            div.style.justifyContent = 'center'
            div.style.color = '#fff'
            div.style.fontSize = '14px'
            div.style.boxShadow = '0 2px 8px rgba(0,0,0,.2)'
            div.style.background =
              count > 100
                ? 'rgba(220,53,69,.85)'
                : count > 50
                  ? 'rgba(255,153,0,.8)'
                  : 'rgba(51,136,255,.75)'
            div.innerText = String(count)
            ctx.marker.on('click', () => {
              this.mapLoader.setZoomAndCenter(20, ctx.clusterData[0].lnglat)
            })
            ctx.marker.setAnchor('center')
            ctx.marker.setContent(div)
          },
        }

        if (this.cluster) {
          // 已有聚合 → 直接更新数据
          this.cluster.setMap && this.cluster.setMap(null)
          this.cluster = new (window as any).AMap.MarkerCluster(
            this.mapLoader,
            this.clusterData,
            options,
          )
        } else {
          this.cluster = new (AMap as any).MarkerCluster(this.mapLoader, this.clusterData, options)
        }
      })
  }

  // 批量添加标记点
  public addMarkers(markersParams: Markers[]) {
    this.hasInitMap()
    // 保存“点数据”（注意：这里是 dataOptions 数组，而不是 Marker 实例）
    this.clusterData = markersParams.map((item) => ({
      lnglat: item.position as [number, number],
      data: item,
    }))
    this.createOrUpdateCluster()
  }
  public removeAllMarkers() {
    this.hasInitMap()
    if (this.cluster) this.cluster.setData([])
    this.clusterData = []
    this.labelMarkerMap.clear()
  }

  public removeMarker(id: string) {
    this.hasInitMap()
    this.clusterData = this.clusterData.filter((p) => p.data.id !== id)
    if (this.cluster) this.cluster.setData(this.clusterData)
    this.labelMarkerMap.delete(id)
  }

  public getAllMarkers() {
    this.hasInitMap()
    return this.clusterData.map((p) => p.data)
  }

  // 展示弹窗
  public showInfoWindow(params: any, closeWindow: () => void) {
    if (this.infoWindow) {
      const { _originOpts } = this.infoWindow
      const oldCarData = _originOpts.content._vnode.props.carData
      if (oldCarData.id === params.id) {
        return
      }
      this.closeInfoWindow()
    }
    const element = document.createElement('div')
    const _infoWindow = h(infoWindow, {
      carData: params,
      closeInfoWindow: closeWindow,
    })
    const app = createApp(_infoWindow)
    app.mount(element)
    this.infoWindow = new AMap.InfoWindow({
      isCustom: true, //使用自定义窗体
      content: element,
      offset: new AMap.Pixel(-230, -280),
    })
    this.infoWindow.open(this.mapLoader, [Number(params.lng), Number(params.lat)])
  }
  public closeInfoWindow() {
    if (this.infoWindow) {
      this.infoWindow.close()
      this.infoWindow = null
    }
  }
  // 逆编码
  public geocoderAddress(lng: string, lat: string) {
    const lnglat = [Number(lng), Number(lat)]
    return new Promise((resolve, reject) => {
      this.geocoder.getAddress(lnglat, function (status: any, result: any) {
        if (status === 'complete' && result.info === 'OK') {
          // result为对应的地理位置详细信息
          resolve(result.regeocode.formattedAddress)
        } else {
          reject(result)
        }
      })
    })
  }
  // 输入提示
  public placeSearch(keyword: string, callback: (status: any, result: any) => void) {
    this.autoComplete.search(keyword, function (status: any, result: any) {
      callback(status, result)
    })
  }
  // 地图点击,拾取点位,出参中通过e.lnglat.getLng()和e.lnglat.getLat()取经纬度
  public mapClick(callback: (e: any) => void) {
    this.mapLoader.on('click', (e: any) => {
      if (this.defaultMarker) {
        this.mapLoader.remove(this.defaultMarker)
        this.defaultMarker = null
      }
      const lng = e.lnglat.getLng()
      const lat = e.lnglat.getLat()
      this.defaultMarker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
      })
      this.mapLoader.add(this.defaultMarker)
      callback(e)
    })
  }
  // 销毁地图点击事件
  public destroyMapClick() {
    this.mapLoader.off('click', () => {})
  }
  /**
   * @description 轨迹回放
   * @param points 轨迹点数组
   * @param movingFn 轨迹移动时的回调函数
   * @param moveEnd 地图移动事件结束回调
   * @returns {totalDistance: number,startAnimation: Function,pauseAnimation: Function,continueAnimation: Function,moveToIndex: Function}
   */
  public drawPolyline(points: any[], movingFn: (params: any) => void, moveEnd: () => void) {
    this.hasInitMap()
    this.mapLoader.on('moveend', () => {
      moveEnd && moveEnd()
    })
    const marker: any = new AMap.Marker({
      map: this.mapLoader,
      position: points[0],
      icon: '/car.png',
      offset: new AMap.Pixel(-13, -26),
    })
    const polyline = new AMap.Polyline({
      path: points,
      showDir: true,
      strokeColor: '#28F', //线颜色
      // strokeOpacity: 1,     //线透明度
      strokeWeight: 6, //线宽
      strokeStyle: 'solid', //线样式
    })
    const passedPolyline = new AMap.Polyline({
      strokeColor: 'red', //线颜色
      strokeWeight: 6, //线宽
    })
    const totalDistance = AMap.GeometryUtil.distanceOfLine(points)
    let currentPassedPolyline: any = []
    marker.on('moving', (e: any) => {
      const passedDistance = AMap.GeometryUtil.distanceOfLine([
        ...currentPassedPolyline,
        ...e.passedPath,
      ])
      const percent = Math.round((passedDistance / totalDistance) * 100)
      // 返回两个参数，第一个参数为当前轨迹点，第二个参数为百分比
      movingFn && movingFn({ movingData: e, percent })
      passedPolyline.setPath([...currentPassedPolyline, ...e.passedPath])
      this.mapLoader.setCenter(e.target.getPosition(), true)
    })
    this.mapLoader.add([polyline, passedPolyline])
    this.mapLoader.setFitView()
    return {
      // 轨迹总距离
      totalDistance,
      // 开始轨迹动画，入参为：速度，起始索引
      startAnimation: (speed = 1, fromIndex = 0) => {
        marker.moveAlong(points.slice(fromIndex), {
          duration: 500 / speed, //可根据实际采集时间间隔设置
          // JSAPI2.0 是否延道路自动设置角度在 moveAlong 里设置
          autoRotation: true,
        })
      },
      // 暂停动画
      pauseAnimation: () => {
        marker.pauseMove()
      },
      // 继续动画
      continueAnimation: () => {
        marker.resumeMove()
      },
      // 跳转到指定索引
      moveToIndex: (index: number) => {
        marker.setPosition(points[index])
        currentPassedPolyline = points.slice(0, index + 1)
        passedPolyline.setPath(currentPassedPolyline)
      },
      removePolyine: () => {
        marker.pauseMove()
        this.mapLoader.remove([polyline, passedPolyline])
        this.mapLoader.remove(marker)
      },
    }
  }
  // 渲染所有轨迹-总览轨迹
  public renderAllPolyline(points: any[]) {
    this.hasInitMap()
    this.overviewPolyline = new AMap.Polyline({
      path: points,
      showDir: true,
      strokeColor: '#28F', //线颜色
      // strokeOpacity: 1,     //线透明度
      strokeWeight: 6, //线宽
      strokeStyle: 'solid', //线样式
    })
    this.overviewPolyline.setPath(points)
    this.mapLoader.add(this.overviewPolyline)
    this.mapLoader.setFitView()
  }
  // 移除总览轨迹
  public removeOverviewPolyline() {
    if (this.overviewPolyline) {
      this.mapLoader.remove(this.overviewPolyline)
      this.overviewPolyline = null
    }
  }
  // 单个点标记
  public drawSingleMarker(lng: number, lat: number) {
    this.hasInitMap()
    if (this.singleMarker) {
      this.mapLoader.remove(this.singleMarker)
      this.singleMarker = null
    }
    if (!lng || !lat) {
      return
    }
    this.singleMarker = new AMap.Marker({
      position: new AMap.LngLat(lng, lat),
    })
    this.mapLoader.add(this.singleMarker)
  }
}
