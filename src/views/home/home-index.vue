<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import MapLoader from "@/utils/mapLoader"
import { ElSwitch, ElImage } from 'element-plus'
import trafficLights from "@/assets/trafficLights.svg"
import carTabList from './carTab-List.vue'

const mapLoader = ref<MapLoader | null>(null)
const mapReady = ref<boolean>(false)
const showCarLicenseFlag = ref<boolean>(false)
const showTrafficLightFlag = ref<boolean>(false)

function initMap() {
	mapLoader.value = new MapLoader()
	mapLoader.value.initMap(
		{
			elId: "map-container"
		},
		() => {
			mapReady.value = true
		}
	)
}

function onTrafficLightChange(flag: any) {
	if (flag) {
		mapLoader.value?.loadTrafficLayer()
	} else {
		mapLoader.value?.removeTrafficLayer()
	}
}

onMounted(() => {
  initMap()
})
</script>
<template>
  <div class="home-container">
    <div class="map-tools">
			<div class="change-map-layer">
				<el-image :src="trafficLights" fit="contain" />
				<el-switch
					v-model="showTrafficLightFlag"
					@change="onTrafficLightChange"
				/>
			</div>
			<div class="show-car-ids">
				<div class="tools-text">车牌号</div>
				<el-switch v-model="showCarLicenseFlag" />
			</div>
		</div>
    <div class="display-board-container" v-if="mapReady">
      <car-tab-list :map-loader="mapLoader" :show-car-license-flag="showCarLicenseFlag" />
    </div>
    <div id="map-container"></div>
  </div>
</template>
<style lang="scss" scoped>
.home-container {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	position: relative;
	width: 100%;
	height: 100%;
	.map-tools {
		position: absolute;
		top: 20px;
		right: 20px;
		z-index: 999;
		.change-map-layer,
		.show-car-ids {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			width: 60px;
			height: 75px;
			border-radius: 10px;
			background-color: #fff;
			font-size: 16px;
			.el-switch {
				margin-top: 10px;
			}
		}
		.show-car-ids {
			margin-top: 15px;
		}
	}
	.display-board-container {
		height: 100%;
    width: 350px;
		.display-board-tab {
			height: 100%;
			:deep(.el-tab-pane) {
				height: 100%;
			}
			:deep(.el-tabs__nav) {
				width: 100%;
				.el-tabs__item {
					width: 50%;
				}
			}
		}
	}
	#map-container {
		flex: 1;
		height: 100%;
	}
}
</style>
