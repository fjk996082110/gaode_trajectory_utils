<script lang="ts" setup>
import { toRef } from "vue"
import { Close, Odometer, Timer, Location, MapLocation, ArrowRight } from "@element-plus/icons-vue"
import { ElIcon } from "element-plus"

const props = defineProps({
	carData: {
		type: Object,
		default: () => {}
	},
	closeInfoWindow: {
		type: Function,
		default: () => {}
	}
})
const _carData = toRef(props, "carData")

function closeWindow() {
	props.closeInfoWindow()
}
function handleCarStatus(data: any) {
	if (data.inFence) {
		return { text: `进入充电区域${data.statusTimeDesc}`, color: "#D62FE5" }
	}
	if (data.status === "离线") {
		return { text: `${data.status}${data.statusTimeDesc}`, color: "#929292" }
	}
	if (data.status === "未绑定") {
		return { text: `${data.status}`, color: "#929292" }
	}
	if (data.status === "静止") {
		return { text: `${data.status}${data.statusTimeDesc}`, color: "#0391FF" }
	}
	if (data.status === "行驶") {
		return { text: `${data.speed}km/h`, color: "#28C840" }
	}
	return { text: "--", color: "#D8D8D8" }
}
function trajectoryCb() {
	const url = `https://uri.amap.com/marker?position=${props.carData.lng},${props.carData.lat}`
	window.open(url)
}
</script>
<template>
	<div class="info-window">
		<div class="info-top">
			<div class="id">{{ _carData.id }}</div>
			<div class="status-close">
				<div class="status" v-if="_carData.inTask">任务中</div>
				<div class="close" @click="closeWindow">
          <el-icon><Close /></el-icon>
				</div>
			</div>
		</div>
		<div class="info-bottom">
			<div class="imi">{{ _carData.imei }}</div>
			<div class="speed-box">
				<div class="speed" :style="{ color: handleCarStatus(_carData).color }">
					{{ handleCarStatus(_carData).text }}
				</div>
				<div
					class="speed-circle"
					:style="{ backgroundColor: handleCarStatus(_carData).color }"
				></div>
			</div>
		</div>
		<div class="info-list">
			<div class="info-item">
        <el-icon><Odometer /></el-icon>
				<span class="item-text">{{ _carData.distance }}km</span>
			</div>
			<div class="info-item">
        <el-icon><Timer /></el-icon>
				<span class="item-text">{{ _carData.gpsTime }}</span>
			</div>
			<div class="info-item">
        <el-icon><Location /></el-icon>
				<span class="item-text">{{ _carData.lng }},{{ _carData.lat }}</span>
			</div>
			<div class="info-item" style="cursor: pointer" @click="trajectoryCb">
				<div class="item-left">
          <el-icon><MapLocation /></el-icon>
					<span class="item-text">{{ _carData.address }}</span>
				</div>
				<div class="item-arrow">
          <el-icon><ArrowRight /></el-icon>
				</div>
			</div>
		</div>
	</div>
</template>
<style lang="scss">
.info-window {
	position: absolute;
	top: 50%;
	left: 50%;
	z-index: 999;
	padding: 16px 26px 26px 26px;
	width: 448px;
	// height: 260px;
	background: #ffffff;
	box-shadow: 0px 4px 14px 0px rgba(6, 13, 97, 0.1);
	border-radius: 2px;
	.info-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		.id {
			font-weight: bold;
			font-size: 16px;
		}
		.status-close {
			display: flex;
			align-items: center;
			font-size: 14px;
			.status {
				padding: 0 5px;
				margin-right: 5px;
				font-size: 12px;
				color: #ff9838;
				background: #fff2e6;
				border: 1px solid rgba(255, 152, 56, 0.5);
				border-radius: 2px;
			}
			.close {
				font-size: 16px;
				line-height: 16px;
				cursor: pointer;
			}
		}
	}
	.info-bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8px;
		font-size: 14px;
		.speed-box {
			display: flex;
			align-items: center;
			// color: #04cb64;
		}
		.speed-circle {
			margin-left: 5px;
			// background-color: #04cb64;
			width: 10px;
			height: 10px;
			border-radius: 50%;
		}
	}
	.info-list {
		margin-top: 16px;
		border-top: 1px solid rgba(12, 25, 41, 0.08);
		.info-item {
			display: flex;
			align-items: center;
			margin-top: 18px;
			line-height: 14px;
			font-size: 14px;
			.el-image {
				margin-right: 8px;
				width: 16px;
				height: 16px;
			}
		}
		.info-item:last-child {
			justify-content: space-between;
		}
	}
}
</style>
