import { MockMethod } from 'vite-plugin-mock'
import TrajectoryJson from './trajectory.json'

export default [
  {
    url: '/mock/api/trajectory',
    method: 'post',
    response: () => {
      return {
        code: 200,
        data: TrajectoryJson,
      }
    },
  },
  {
    url: '/mock/api/searchTrajectory',
    method: 'get',
    response: () => {
      return {
        code: 200,
        data: [
          {
            id: '京WZ0910',
            carNum: '京WZ0910',
            imei: '862561760538486',
            tags: ['机动组'],
            bindTime: '2025-09-18 12:00',
            status: '行驶',
            lng: '116.41',
            lat: '39.89',
            statusTimeDesc: '1天21时10分41秒',
            speed: 0,
            course: 0,
            chargePercentage: 80,
            accStatus: 'false',
            gpsTime: '2025-10-11 11:05',
            signalTime: '2025-10-11 14:27',
            inTask: false,
            taskStatus: '',
            online: true,
            inFence: false,
            tel: '',
            sq: '162641',
          },
        ],
      }
    },
  },
] as MockMethod[]
