<script lang="ts" setup>
import { ref, onMounted, defineEmits, defineProps, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { ElTree, ElButton, ElPopover, ElScrollbar, ElImage } from 'element-plus'
import { getAssetsFile } from '@/utils/index'
import axios from 'axios'
// import { useSSE } from '@/utils/useSSE'

const router = useRouter()
const emits = defineEmits(['treeCheck'])

// const sse = useSSE("/mock/api/sse/trace")

const props = defineProps<{
  mapLoader: any
	showCarLicenseFlag: boolean
}>()

const showCarLicense = toRef(props, "showCarLicenseFlag")
const dataSource = ref<any[]>([])
const treeRef = ref<any>(null)
const currentMarkerId = ref<string>("")
const carCheckedList = ref<any[]>([])

function findNodeById(tree: any[], id: string) {
	for (const node of tree) {
		if (node.id === id) return node
		if (node.children) {
			const found: any = findNodeById(node.children, id)
			if (found) return found
		}
	}
	return null
}

function clickMarker(id: string) {
	if (currentMarkerId.value === id) {
		return
	}
	currentMarkerId.value = id
	const clickData = findNodeById(dataSource.value, id)
	axios.post('/mock/api/getCarDistance', { data: { id: clickData.id, imei: clickData.imei }}).then(async (dis: any) => {
    const { distance } = dis.data.data
		clickData.distance = distance
		clickData.address = await props.mapLoader.geocoderAddress(
			clickData.lng,
			clickData.lat
		)
		props.mapLoader.showInfoWindow(clickData, () => {
			currentMarkerId.value = ""
			props.mapLoader.closeInfoWindow()
		})
	})
}

// 渲染所有点位icon
function getCarList() {
  const markersArr: any[] = []
  axios.get('/mock/api/list').then((res: any) => {
    dataSource.value = res.data.data
    res.data.data[0].children.forEach((item: any) => {
      carCheckedList.value.push(item.id)
      markersArr.push({
        id: item.id,
        position: [Number(item.lng), Number(item.lat)],
        type: item.inFence
          ? "charging"
          : item.status === "静止"
          ? "stop"
          : "online",
        clickCallBack: clickMarker,
        showCarId: showCarLicense.value
      })
    })
    props.mapLoader.addMarkers(markersArr)
    treeRef.value.setCheckedKeys(carCheckedList.value)
  })
}
getCarList()

// 当前车辆状态
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
	if (data.status === "休眠") {
		return { text: `休眠 ${data.statusTimeDesc}`, color: "#929292" }
	}
	return { text: "--", color: "#D8D8D8" }
}

function onHandleTrack(data: any) {
	router.push({
		path: "/trajectory",
		query: {
			id: data.id,
			imei: data.imei
		}
	})
}

function onTreeCheckChange() {
	const checkedList = treeRef.value?.getCheckedNodes()
	const resList: any[] = []
	checkedList?.forEach((item: any) => {
		if (!item.isNode) {
			resList.push(item)
		}
	})
	emits("treeCheck", resList)
}

onMounted(() => {
	setTimeout(() => {
		document.querySelectorAll(".car-status-item-text").forEach((el: any) => {
			if (el.scrollWidth > el.clientWidth) {
				el.classList.add("marquee")
			}
		})
	}, 2000)
})

// sse示意
// watch(
// 	() => sse.data.value,
// 	(res: any) => {
//     // 监听到sse变化后，更新点位，并关闭之前的打开的弹窗
//     const markersArr: any[] = []
// 		res.forEach((item: any) => {
//       markersArr.push({
//         id: item.id,
//         position: [Number(item.lng), Number(item.lat)],
//         type: item.inFence
//           ? "charging"
//           : item.status === "静止"
//           ? "stop"
//           : "online",
//         clickCallBack: clickMarker,
//         showCarId: showCarLicense.value
//       })
//     })
//     nextTick(() => {
//       props.mapLoader.closeInfoWindow()
//     })
//     props.mapLoader.addMarkers(markersArr)
// 	},
// 	{ deep: true }
// )
</script>
<template>
  <div class="car-tab-container">
    <el-scrollbar height="100%">
			<el-tree
				ref="treeRef"
				:props="{ disabled: 'disabled' }"
				:data="dataSource"
				show-checkbox
				node-key="id"
				default-expand-all
				:expand-on-click-node="true"
				:check-on-click-leaf="false"
				@check="onTreeCheckChange"
			>
				<template #default="{ node, data }">
					<div class="tree-node" v-if="data.isNode">
						{{ node.label }}({{ data.num }})
					</div>
					<div class="custom-tree-node" v-if="!data.isNode">
						<div class="node-name">
							<span
								:style="{
									color: handleCarStatus(data)?.color,
									fontWeight: 700
								}"
								>{{ data.id }}</span
							>
							<div class="in-task-icon" v-if="data.inTask">任务中</div>
						</div>
						<div class="status-group" v-if="!data.isNode">
							<div
								class="car-status-item"
								:style="{ color: handleCarStatus(data)?.color }"
							>
								<div class="car-status-item-text">
									{{ handleCarStatus(data)?.text }}
								</div>
							</div>
							<div class="status-popover">
								<div
									class="car-status-circle"
									:style="{ backgroundColor: handleCarStatus(data)?.color }"
								/>
								<el-popover
									placement="right"
									:width="100"
									trigger="click"
								>
									<template #reference>
										<el-button link>
											<template #icon>
                        <el-image :src="getAssetsFile('other.svg')" />
											</template>
										</el-button>
									</template>
									<div class="popover-btn-list">
										<div class="popover-btn-item" @click="onHandleTrack(data)">
											轨迹回放
										</div>
									</div>
								</el-popover>
							</div>
						</div>
					</div>
				</template>
			</el-tree>
		</el-scrollbar>
  </div>
</template>
<style lang="scss" scoped>
@keyframes marquee-content {
	0% {
		transform: translateX(5%);
	}
	100% {
		transform: translateX(-60%);
	}
}
.car-tab-container {
	height: 100%;
	.tree-node {
		font-size: 16px;
		font-weight: bold;
	}
	.custom-tree-node {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: calc(100% - 20px);
		.node-name {
			display: flex;
			align-items: center;
			.in-task-icon {
				margin: 0 10px;
				width: 35px;
				height: 16px;
				line-height: 16px;
				color: #ff821e;
				border-radius: 3px;
				border: 1px solid #ff821e;
				font-size: 10px;
				font-weight: bold;
				text-align: center;
			}
		}
		.status-group {
			display: flex;
			align-items: center;
			font-size: 14px;
			.car-status-item {
				overflow: hidden;
				.car-status-item-text {
					float: left;
					max-width: 120px;
				}
			}
			.status-popover {
				display: flex;
				align-items: center;
				.car-status-circle {
					margin: 0 5px;
					width: 10px;
					height: 10px;
					border-radius: 50%;
				}
			}
		}
	}
}
.marquee {
	animation: marquee-content linear 4s infinite;
}
</style>
<style lang="scss">
.popover-btn-list {
	display: flex;
	flex-direction: column;
	.popover-btn-item {
		height: 25px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		&:hover {
			background-color: #f5f5f5;
		}
	}
}
</style>
