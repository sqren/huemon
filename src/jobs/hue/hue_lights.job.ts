import got from 'got';
import { EnvConfig } from '../../lib/get_env';
import { Job } from '../../lib/types';
import { LightApi } from './hue_lights.sample';

export const hueLightsJob: Job = {
  name: 'hue-lights',
  interval: 1000 * 60,
  indexTemplateName: 'hue-lights',
  indexPattern: {
    title: 'hue-lights*',
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
      state: {
        dynamic: false,
        properties: {
          on: { type: 'boolean' },
          color_temperature: { type: 'short' },
          reachable: { type: 'boolean' },
          brightness: { type: 'short' },
        },
      },
    },
  },

  getDocs: async (envConfig: EnvConfig) => {
    const res = (await got
      .get(`${envConfig.hue.api.host}/api/${envConfig.hue.api.key}/lights`, {
        timeout: { request: 5000 },
      })
      .json()) as LightApi;

    const nowDate = new Date();
    const lights = Object.values(res).map((light) => {
      const [room] = light.name.split(',');
      return {
        name: light.name,
        room,
        '@timestamp': nowDate.toISOString(),
        hour_of_day: nowDate.getHours(),
        day_of_week: nowDate.getDay(),
        state: {
          reachable: light.state.reachable,
          on: light.state.on,
          // @ts-expect-error: ignore the fact that `ct` is optional
          color_temperature: light.state.ct,
          brightness: light.state.bri,
        },
      };
    });

    return lights;
  },
};
