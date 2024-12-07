function insertTAGGroups(config, proxyTuples) {
  const newProxyGroups = [];

  // 遍历原始代理组
  for (const group of config['proxy-groups']) {
    // 将原始组添加到新数组
    newProxyGroups.push(group);
    // 在元组中查找对应的TAG组
    const correspondingTuple = proxyTuples.find(tuple => tuple[0] === group.name);
    
    if (correspondingTuple) {
      // 找到对应的TAG组并插入
      const tagGroup = TAGGroup.find(tag => tag.name === correspondingTuple[1]);
      if (tagGroup) {
        newProxyGroups.push(tagGroup);
      }
    }
  }

  config['proxy-groups'] = newProxyGroups;
  return config;
}

const TAGGroup = [
  { name: 'TAG-HK', type: 'select', use: ['TAG-HK-p'] },
  { name: 'TAG-US', type: 'select', use: ['TAG-US-p'] },
  { name: 'TAG-Home', type: 'select', use: ['TAG-Home-p'] }
];

const proxyTuples = [
  ['HK', 'TAG-HK'], 
  ['US', 'TAG-US'], 
  ['UK', 'TAG-Home']
];

const slectInsertPositions = {
  'HK': 'TAG-HK',
  'US': 'TAG-US', 
  'UK': 'TAG-Home'
};

function insertProxyGroups(config, insertPositions) {
  const { 'proxy-groups': proxy = [] } = config;

  proxy.forEach(group => {
    if (group.name === "SELECT") {
      Object.entries(insertPositions).forEach(([region, tag]) => {
        const regionIndex = group.proxies.indexOf(region);

        if (regionIndex !== -1) {
          group.proxies.splice(regionIndex + 1, 0, tag);
        }
      });
    } else if (group.name === "AI") {
      group.proxies = group.proxies || [];
      
      // 插入TAG-US作为第一个元素
      group.proxies.unshift('TAG-US');
      // 插入TAG-Home作为第二个元素
      group.proxies.splice(1, 0, 'TAG-Home');
    }
  });

  return config;
}

function main(config, profileName) {
  config = insertTAGGroups(config, proxyTuples);
  config = insertProxyGroups(config, slectInsertPositions);
  return config;
}
