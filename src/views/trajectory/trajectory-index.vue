<script lang="ts" setup>
import { ref, reactive, onMounted, watch } from "vue"
import { useRoute } from "vue-router"
import { Search, VideoPlay, Share, Download } from "@element-plus/icons-vue"
import { ElImage, ElSelect, ElOption, ElMessage, ElIcon, ElDatePicker, ElAutocomplete, ElSlider, ElButton, ElForm, ElFormItem } from "element-plus"
import { getAssetsFile } from '@/utils/index'
import MapLoader from "@/utils/mapLoader"
import dayjs from "dayjs"
import axios from "axios"

const route = useRoute()

const mapLoader = ref<any>(null)
const searchForm = reactive({
	id: "",
	time: [],
	imei: "",
	carNumImei: ""
})
const isPlay = ref<boolean>(false)
const hasStart = ref<boolean>(false)
const sliderValue = ref<number>(0)
const speedValue = ref<number>(1)
const points = ref<any[]>([])
const mapPolylineFn = ref<any>({})
const currentIndex = ref<number>(0)
const needContinuePlay = ref<boolean>(false) // 暂停后，如果没有拖动进度条，则继续播放，否则执行startAnimation
const isAllPolyline = ref<boolean>(false)
const mapReady = ref<boolean>(false)
let pendingAction: (() => void) | null = null

function initMap() {
	mapLoader.value = new MapLoader()
	mapLoader.value.initMap({
		elId: "trajectory-map",
		zoom: 12
	})
}

function getPointsById() {
	return new Promise<void>((resolve, reject) => {
		const params = {
			carNum: searchForm.id,
			imei: searchForm.imei,
			startTime: dayjs(searchForm.time[0]).format("YYYY-MM-DD HH:mm:ss"),
			endTime: dayjs(searchForm.time[1]).format("YYYY-MM-DD HH:mm:ss"),
			onlyTrace: true
		}
		axios.post('/mock/api/trajectory', params)
			.then((res: any) => {
				if (res.data.data.length === 0) {
					reject()
				}
				const tempRes = JSON.parse(JSON.stringify(res.data.data))
				tempRes.forEach((item: any) => {
					item[0] = Number(item[0])
					item[1] = Number(item[1])
				})
				points.value = tempRes
				resolve()
			})
			.catch(() => {
				reject()
			})
	})
}

function drawMoving({ percent }: any) {
	sliderValue.value = percent
	if (sliderValue.value === 100) {
		isPlay.value = false
		return
	}
	// 根据百分比更新当前索引
	const targetIndex = Math.floor(points.value.length * percent)
	currentIndex.value = targetIndex
}

function onPlay() {
	isPlay.value = !isPlay.value
	// 播放完后，重置数据
	if (sliderValue.value >= 100) {
		sliderValue.value = 0
		currentIndex.value = 0
		needContinuePlay.value = false
		mapPolylineFn.value.moveToIndex(0)
	}
	if (needContinuePlay.value) {
		mapPolylineFn.value.continueAnimation()
		return
	}
	mapPolylineFn.value.startAnimation(speedValue.value, currentIndex.value)
}
function onPause() {
	needContinuePlay.value = true
	isPlay.value = !isPlay.value
	mapPolylineFn.value.pauseAnimation()
}

function onSpeedChange() {
	if (isPlay.value) {
		isPlay.value = false
		needContinuePlay.value = false
		mapPolylineFn.value.pauseAnimation()
		const targetIndex = Math.round(
			(sliderValue.value / 100) * points.value.length
		)
		currentIndex.value = targetIndex
		mapPolylineFn.value.moveToIndex(targetIndex)
		// mapPolylineFn.value.startAnimation(speedValue.value, currentIndex.value)
	}
}
/**
 * 滑块拖动时，暂停动画，并根据滑块值更新当前轨迹索引
 * 同时不需要继续执行动画，而是重新开始动画
 */
function onSliderChange(val: any) {
	needContinuePlay.value = false
	isPlay.value = false
	mapPolylineFn.value.pauseAnimation()
	const targetIndex = Math.round((val / 100) * points.value.length)
	currentIndex.value = targetIndex
	mapPolylineFn.value.moveToIndex(targetIndex)
}

// 全览
function renderAllPolyline() {
	isAllPolyline.value = true
	if (points.value.length === 0) {
		goStart("fn")
	} else {
		hasStart.value = false
		needContinuePlay.value = false
		isPlay.value = false
		mapPolylineFn.value && mapPolylineFn.value.removePolyine()
		mapLoader.value.renderAllPolyline(points.value)
	}
}
// 地图移动结束后重新执行轨迹绘制
function mapReadyFn() {
	pendingAction && pendingAction()
	pendingAction = null
}
// 开始，需要区分是总览函数调用还是按钮点击事件触发。如果是按钮触发，则需要将重置
function goStart(type: "btn" | "fn") {
	if (type === "btn") {
		mapPolylineFn.value && mapPolylineFn.value?.removePolyine?.()
		isAllPolyline.value = false
		speedValue.value = 1
		currentIndex.value = 0
		isPlay.value = false
	}
	if (searchForm.id === "" || searchForm.time.length === 0) {
		ElMessage.error("请输入查询条件")
		return
	}
	getPointsById().then(() => {
		if (isAllPolyline.value) {
			mapLoader.value.removeOverviewPolyline()
			mapLoader.value.renderAllPolyline(points.value)
		} else {
			hasStart.value = true
			mapPolylineFn.value = mapLoader.value.drawPolyline(
				points.value,
				drawMoving,
				mapReadyFn
			)
			// 如果地图移动事件未完成，则缓存play方法，等待地图移动完成后再执行
			if (mapReady.value) {
				onPlay()
			} else {
				pendingAction = () => onPlay()
			}
		}
	})
}
// 关闭
function onCancel() {
	hasStart.value = false
	isPlay.value = false
	isAllPolyline.value = false
	speedValue.value = 1
	currentIndex.value = 0
	mapPolylineFn.value.removePolyine()
}
// 下载
function downloadFn() {
	if (searchForm.id === "" || searchForm.time.length === 0) {
		ElMessage.error("请输入查询条件")
		return
	}
	console.log('下载')
}

// 自动补全
function querySearchAsync(queryString: string, cb: (arg: any) => void) {
	if (queryString == "") {
		return
	}
	axios.get('/mock/api/searchTrajectory')
		.then((res: any) => {
			cb(res.data.data)
		})
		.catch(() => {
			cb([])
		})
}
function handleSelect(item: any) {
	searchForm.imei = item.imei
	searchForm.id = item.carNum
	searchForm.carNumImei = item.carNum + "(" + item.imei + ")"
}
function handleClear() {
	searchForm.imei = ""
	searchForm.id = ""
}

onMounted(() => {
	initMap()
})

watch(
	() => route.query,
	(query: any) => {
		if (query.id) {
			searchForm.id = query.id
			searchForm.imei = query.imei ?? ""
			searchForm.carNumImei = query.id + "(" + query.imei + ")"
		}
	},
	{ immediate: true }
)
</script>
<template>
	<div class="trajectory-container">
		<div class="search-header">
			<el-form :model="searchForm" label-width="80px" inline>
				<el-form-item>
					<el-autocomplete
						style="width: 300px"
						placeholder="请输入设备名称"
						v-model="searchForm.carNumImei"
						:clearable="true"
						:fetch-suggestions="querySearchAsync"
						:trigger-on-focus="false"
						@select="handleSelect"
						@clear="handleClear"
					>
						<template #suffix>
							<el-icon><Search /></el-icon>
						</template>
						<template #default="{ item }">
							<span>{{ item.carNum }}({{ item.imei }})</span>
						</template>
					</el-autocomplete>
				</el-form-item>
				<el-form-item label="时间">
					<el-date-picker
						v-model="searchForm.time"
						type="datetimerange"
						range-separator="至"
						start-placeholder="开始时间"
						end-placeholder="结束时间"
						format="YYYY-MM-DD HH:mm"
						value-format="YYYY-MM-DD HH:mm"
						time-format="HH:mm"
					/>
				</el-form-item>
				<el-form-item>
					<el-button @click="goStart('btn')" type="primary">
						<template #icon>
							<el-icon><VideoPlay /></el-icon>
						</template>
						开始
					</el-button>
					<el-button @click="renderAllPolyline">
						<template #icon>
							<el-icon><Share /></el-icon>
						</template>
						总览
					</el-button>
					<el-button @click="downloadFn">
						<template #icon>
							<el-icon><Download /></el-icon>
						</template>
						轨迹下载
					</el-button>
				</el-form-item>
			</el-form>
		</div>
		<div id="trajectory-map"></div>
		<div class="video-tools" v-if="hasStart && !isAllPolyline">
			<div class="play-icon">
				<el-image :src="getAssetsFile('play.svg')" v-if="isPlay" @click="onPause" />
				<el-image :src="getAssetsFile('pause.svg')" v-if="!isPlay" @click="onPlay" />
			</div>
			<el-slider v-model="sliderValue" @change="onSliderChange" />
			<div class="slider-text">速度</div>
			<el-select
				v-model="speedValue"
				@change="onSpeedChange"
				style="width: 200px"
			>
				<el-option label="0.5倍" :value="0.5" />
				<el-option label="1倍" :value="1" />
			</el-select>
			<el-button type="danger" @click="onCancel">关闭</el-button>
		</div>
	</div>
</template>
<style lang="scss" scoped>
.trajectory-container {
	position: relative;
	padding: 10px;
	width: 100%;
	height: 100%;
	.search-header {
		position: absolute;
		left: 10px;
		top: 5px;
		z-index: 10;
		padding: 0 5px;
		display: flex;
		align-items: center;
		height: 60px;
		width: calc(100% - 20px);
		background-color: #fff;
		:deep(.el-form) {
			.el-form-item {
				margin-bottom: 0;
			}
		}
	}
	#trajectory-map {
		width: 100%;
		height: 100%;
	}
	.video-tools {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		bottom: 50px;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 5px 20px;
		background-color: #fff;
		width: 800px;
		.play-icon {
			font-size: 14px;
			cursor: pointer;
			.el-image {
				width: 35px;
				height: 35px;
			}
		}
		.el-slider {
			width: 300px;
		}
	}
}
</style>
