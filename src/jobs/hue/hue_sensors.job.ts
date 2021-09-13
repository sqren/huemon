import got from 'got';
import { EnvConfig } from '../../lib/get_env';
import { Job } from '../../lib/types';
import { SensorsApi } from './hue_sensors.sample';

export const hueSensorsJob: Job = {
  name: 'hue-sensors',
  interval: 1000 * 5,
  indexTemplateName: 'hue-sensors',
  indexPattern: {
    title: 'hue-sensors*',
    timeFieldName: '@timestamp',
  },
  indexTemplateMappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      room: { type: 'keyword' },
      '@timestamp': { type: 'date' },
      hour_of_day: { type: 'byte' },
      day_of_week: { type: 'byte' },
      product_name: { type: 'keyword' },
      type: { type: 'keyword' },
      state: {
        dynamic: true,
        properties: {
          // light sensor
          lightlevel: { type: 'short' },
          dark: { type: 'boolean' },
          daylight: { type: 'boolean' },

          // temp sensor
          temperature: { type: 'float' },

          // motion sensor
          presence: { type: 'boolean' },

          // common
          reachable: { type: 'boolean' },
          lastupdated: { type: 'date' },
        },
      },
    },
  },

  getDocs: async (envConfig: EnvConfig) => {
    const res: SensorsApi = await got
      .get(`${envConfig.hue.api.host}/api/${envConfig.hue.api.key}/sensors`, {
        timeout: { request: 5000 },
      })
      .json();

    return Object.values(res)
      .filter((sensor) =>
        ['ZLLLightLevel', 'ZLLPresence', 'ZLLTemperature'].includes(sensor.type)
      )
      .map((sensor) => {
        const dateNow = new Date();
        const [room] = sensor.name.split(',');
        return {
          name: sensor.name,
          room,
          '@timestamp': dateNow.toISOString(),
          hour_of_day: dateNow.getHours(),
          day_of_week: dateNow.getDay(),
          //@ts-expect-error: `productname` is optional
          product_name: sensor.productname,
          state: {
            ...sensor.state,
            temperature:
              'temperature' in sensor.state
                ? sensor.state.temperature / 100
                : undefined,
            //@ts-expect-error: `reachable` is optional
            reachable: sensor.config.reachable,
          },
          type: sensor.type,
        };
      });
  },
};
