import { MockMethod } from 'vite-plugin-mock'
import CarListJSON from './carList.json'

export default [
  {
    url: '/mock/api/list',
    method: 'get',
    response: () => {
      return {
        code: 200,
        data: CarListJSON,
      }
    },
  },
  {
    url: '/mock/api/getCarDistance',
    method: 'post',
    response: () => {
      return {
        code: 200,
        data: {
          distance: 1000,
        },
      }
    },
  },
] as MockMethod[]
