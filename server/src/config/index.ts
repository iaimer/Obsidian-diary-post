import configJson from '../../config.json' with { type: 'json' };

export default {
  vaultPath: configJson.vaultPath,
  apiToken: configJson.apiToken,
  port: configJson.port
};