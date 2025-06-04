function main(config) {
    delOriginRuleAndProxys(config);
    addProxyToGroup(config);
    addRegionGroupsToCustomGroups(config);
    config["rules"] = [...rules];
    updateDNS(config);
    return config;
}

const groupNames = [
    "AI",
    "Amusement",
    "China",
    "Download",
    "GAM",
    "Netflix",
    "Tech"
]

function updateDNS(config) {
    const hostConfig = {
        "doh.pub": ["1.12.12.12", "120.53.53.53"],
        "dns.alidns.com": ["223.5.5.5", "223.6.6.6"]
    };

    const dnsConfig = {
        "enable": true,
        "ipv6": false,
        "listen": "0.0.0.0:53",
        "use-hosts": true,
        "enhanced-mode": "fake-ip",
        "fake-ip-range": "198.18.0.1/16",
        "fake-ip-filter": [
            "rule-set:Fakeip-filter",
            "rule-set:Private",
            "rule-set:China"
        ],
        "nameserver": [
            "https://doh.pub/dns-query",
            "https://dns.alidns.com/dns-query"
        ],
        "direct-nameserver": [
            "https://doh.pub/dns-query",
            "https://dns.alidns.com/dns-query"
        ],
    };

    config["find-process-mode"] = "strict";
    config["global-client-fingerprint"] = "chrome";
    config["host"] = hostConfig;
    config["dns"] = dnsConfig;
}

function delOriginRuleAndProxys(config) {
    // Delete the original rules and proxies
    config['proxy-groups'] = [];
    config.rules = [];

    const selectGroup = { name: 'SELECT', type: 'select', proxies: [] };
    const finalGroup = { name: 'Final', type: 'select', 
        proxies: [ "SELECT", "DIRECT" ] };


    // Create a new proxy group based on groupNames 
    config['proxy-groups'] = [
        selectGroup,
        ...groupNames.map(name => ({ name, type: 'select', proxies: [] })),
        finalGroup
    ];

    return config;
}

function assignProxyGroups(config, { Auto, MustProxy, DirectFirst, Select, ProxyFirst, baseProxy, AI, Netflix, StarPlusLogin, StarPlus }) {
    const mapping = {
        Amusement: MustProxy,
        GAM: MustProxy,
        China: DirectFirst,
        Download: ProxyFirst,
        Tech: ProxyFirst,
        SELECT: Select,
        AI: AI,
        Netflix: Netflix,
        StarPlusLogin: StarPlusLogin,
        StarPlus: StarPlus
    };

    const baseGroup = groupNames; // 假定 groupNames 是全局或外部变量
    (config['proxy-groups'] || []).forEach(group => {
        if (mapping.hasOwnProperty(group.name)) {
            group.proxies = mapping[group.name];
        } else if (baseGroup.includes(group.name)) {
            group.proxies = ProxyFirst;
        }
    });
    return config;
}

function addProxyToGroup(config) {
    const regions = customGroups.reduce((acc, group) => {
        acc[group.name] = new RegExp(group.pattern.slice(1, -1));
        return acc;
    }, {});

    const proxyGroups = Object.keys(regions).map(region => {
        const existingGroup = config['proxy-groups'] && config['proxy-groups'].find(g => g.name === region);
        if (existingGroup) {
            if (!existingGroup.proxies) {
                existingGroup.proxies = [];
            }
            return existingGroup;
        }
        return {
            name: region,
            type: 'select',
            proxies: []
        };
    });

    config.proxies.forEach(proxy => {
        if (proxy.name.includes('Premium')) {
            return;   
        }

        for (const [region, regex] of Object.entries(regions)) {
            if (regex.test(proxy.name)) {
                const group = proxyGroups.find(g => g.name === region);
                if (group) {
                    group.proxies.push(proxy.name);
                }
            }
        }
    });

    config['proxy-groups'] = [
        ...config['proxy-groups'], 
        ...proxyGroups.filter(group => 
            (group.proxies && group.proxies.length > 0) || 
            (group.use && group.use.length > 0)
        ).filter(group => !config['proxy-groups'].some(existingGroup => existingGroup.name === group.name))
    ];

    return config;
}

function addRegionGroupsToCustomGroups(config) {
    const combineAndDeduplicate = (...arrays) => [...new Set(arrays.flat())];
    const constructGroup = (specificNames, defaultNames) =>
        combineAndDeduplicate(specificNames.filter(name => baseProxy.includes(name)), defaultNames);

    const defaultGroup = ["PROXY", "Final"];
    const baseGroup = groupNames; // 假定 groupNames 是全局或外部变量

    // 从 proxy-groups 中提取有效的 baseProxy 名称
    const baseProxy = (config['proxy-groups'] || [])
        .filter(group => group.type === 'select')
        .map(group => group.name)
        .filter(name => !baseGroup.includes(name) && !defaultGroup.includes(name) && name !== 'SELECT');

    const Auto = ["SELECT", ...constructGroup(["US"], baseProxy)];
    const Select = constructGroup(["US"], baseProxy);
    const MustProxy = ["SELECT", ...baseProxy];
    const DirectFirst = ["DIRECT", ...MustProxy];
    const ProxyFirst = ["SELECT", "DIRECT", ...baseProxy];
    const AI = constructGroup(["US"], MustProxy);
    const Netflix = constructGroup(["SG"], baseProxy);
    const StarPlusLogin = constructGroup(["America"], MustProxy);
    const StarPlus = constructGroup(["US"], MustProxy);

    return assignProxyGroups(config, { Auto, MustProxy, DirectFirst, Select, ProxyFirst, baseProxy, AI, Netflix, StarPlusLogin, StarPlus });
}

const rules = [
    "IP-CIDR,118.190.20.162/8,DIRECT",
    // "IP-CIDR,34.92.28.5/32,DIRECT",
    "DOMAIN-SUFFIX,kagi.com,GAM",
    // "DOMAIN-SUFFIX,github.dev,DIRECT",
    "DOMAIN-SUFFIX,wqatom.lol,DIRECT",
    "IP-CIDR,127.0.0.1/8,DIRECT",
    "DOMAIN-KEYWORD,shanbay,DIRECT",
    "DOMAIN-KEYWORD,zhihuishu.com,DIRECT",
    "DOMAIN-KEYWORD,weread.qq.com,DIRECT",
    "DOMAIN-KEYWORD,chaoxing.com,DIRECT",
    "DOMAIN-KEYWORD,xuetangx.com,DIRECT",
    "DOMAIN-KEYWORD,icourse163.org,DIRECT",
    "DOMAIN-KEYWORD,unipus.cn,DIRECT",
    "DOMAIN-KEYWORD,deepl.com,Tech",
    "DOMAIN-KEYWORD,lingvanex,Tech",
    "DOMAIN-KEYWORD,leetcode.com,Tech",
    "DOMAIN-KEYWORD,leetcode.cn,DIRECT",
    "RULE-SET,AI,AI",
    "RULE-SET,Gemini-c,AI",
    "RULE-SET,Netflix,Netflix",
    "RULE-SET,Netflix-ipcidr,Netflix",
    "RULE-SET,Netflix-cla,Netflix",
    "RULE-SET,Packages,Download",
    "RULE-SET,Steam-download,Download",
    "RULE-SET,Download,Download",
    "RULE-SET,Speedtest,Download",
    "RULE-SET,Amusement,Amusement",
    "RULE-SET,Amusement-ipcidr,Amusement",
    "RULE-SET,Amusement-cla,Amusement",
    "RULE-SET,Telegram-ipcidr,Amusement",
    "RULE-SET,Telegram,Amusement",
    "RULE-SET,Steam,Amusement",
    "RULE-SET,Tiktok,Amusement",
    "RULE-SET,Tiktok-c,Amusement",
    "RULE-SET,Apple-domain,GAM",
    "RULE-SET,Apple-ipcidr,GAM",
    "RULE-SET,Google,GAM",
    "RULE-SET,Google-ipcidr,GAM",
    "RULE-SET,Microsoft,GAM",
    "RULE-SET,PayPal,GAM",
    "RULE-SET,Amazon,GAM",
    "RULE-SET,Coursera,Tech",
    "RULE-SET,Tech,Tech",
    "RULE-SET,Github,Tech",
    // DIRECT or China
    "RULE-SET,Arch-mirrors,DIRECT",
    "RULE-SET,Bilibili,China",
    "RULE-SET,Bilibili-ipcidr,China",
    "RULE-SET,Bilibili-cla,China",
    "RULE-SET,Scholar,Tech",
    "RULE-SET,China,China",
    "RULE-SET,China-ipcidr,China",
    "RULE-SET,China-cla,China",
    "RULE-SET,LAN,DIRECT",
    "RULE-SET,reject,REJECT",
    "MATCH,Final"
]

const customGroups = [
    // {
    //   "name": "HK",
    //   "pattern": "/^(.*)(香港|Hong Kong|HK|澳门)+(.*)$/"
    // },
    // {
    //   "name": "TW",
    //   "pattern": "/^(.*)(台湾|TW|TaiWan|Taiwan)+(.*)$/"
    // },
    {
        "name": "HT",
        "pattern": "/^(.*)(香港|Hong Kong|HK|澳门|台湾|TW|TaiWan|Taiwan)+(.*)$/"
    },
    {
        "name": "SG",
        "pattern": "/^(.*)(新加坡|SG|Singapore|狮城)+(.*)$/"
    },
    {
        "name": "US",
        "pattern": "/^(.*)(美国|US|USA)+(.*)$/"
    },
    {
        "name": "Other",
        "pattern": "/^(.*)(日本|JP|Japan|韩国|KR|Korea|马来西亚|马尔代夫|柬埔寨|泰国|TG|缅甸|老挝|越南|不丹|文莱|朝鲜|菲律宾|印尼|Indonesia|印度|India|蒙古|约旦|伊朗|巴林|阿曼|以色列|土耳其|TR|尼泊尔|东帝汶|孟加拉|黎巴嫩|伊拉克|叙利亚|阿富汗|卡塔尔|阿联酋|阿塞拜疆|亚美尼亚|格鲁吉亚|巴基斯坦|斯里兰卡|沙特阿拉伯|哈萨克斯坦|吉尔吉斯斯坦|乌兹别克斯坦|United Arab Emirates|科威特|加拿大|Canada|墨西哥|巴拿马|百慕大|格陵兰|哥斯达黎加|英属维尔京|巴西|Brazil|智利|Chile|秘鲁|古巴|阿根廷|Argentina|乌拉圭|牙买加|苏里南|荷属库拉索|哥伦比亚|厄瓜多尔|委内瑞拉|危地马拉|波多黎各|开曼群岛|法属圭亚那|特立尼达和多巴哥|玻利维亚|海地|圭亚那|多米尼加|澳大利亚|Australia|AU|新西兰|关岛|斐济|南极|英国|UK|Netherlands|荷兰|Russia|俄罗斯|Germany|德国|DE|France|法国|Switzerland|瑞士|Sweden|瑞典|Bulgaria|保加利亚|Austria|奥地利|Ireland|爱尔兰|Turkey|Hungary|法国|英国|马恩岛|德国|丹麦|挪威|瑞典|芬兰|冰岛|瑞士|捷克|希腊|荷兰|波兰|黑山|俄罗斯|乌克兰|匈牙利|卢森堡|奥地利|意大利|梵蒂冈|比利时|爱尔兰|立陶宛|西班牙|葡萄牙|安道尔|马耳他|摩纳哥|保加利亚|克罗地亚|北马其顿|塞尔维亚|塞浦路斯|拉脱维亚|摩尔多瓦|斯洛伐克|爱沙尼亚|白俄罗斯|罗马尼亚|直布罗陀|圣马力诺|法罗群岛|奥兰群岛|斯洛文尼亚|阿尔巴尼亚|波黑共和国|列支敦士登|法属留尼汪|埃及|加纳|南非|摩洛哥|突尼斯|肯尼亚|卢旺达|佛得角|安哥拉|尼日利亚|毛里求斯|多哥|斯威士兰|刚果|马里)+(.*)/"
    }
    // {
    //   "name": "Asia",
    //   "pattern": "/^(.*)(日本|JP|Japan|韩国|KR|Korea|马来西亚|马尔代夫|柬埔寨|泰国|TG|缅甸|老挝|越南|不丹|文莱|朝鲜|菲律宾|印尼|Indonesia|印度|India|蒙古|约旦|伊朗|巴林|阿曼|以色列|土耳其|TR|尼泊尔|东帝汶|孟加拉|黎巴嫩|伊拉克|叙利亚|阿富汗|卡塔尔|阿联酋|阿塞拜疆|亚美尼亚|格鲁吉亚|巴基斯坦|斯里兰卡|沙特阿拉伯|哈萨克斯坦|吉尔吉斯斯坦|乌兹别克斯坦|United Arab Emirates|科威特)+(.*)/"
    // },
    // {
    //   // America && Oceania
    //   "name": "AO",
    //   "pattern": "/^(.*)(加拿大|Canada|墨西哥|巴拿马|百慕大|格陵兰|哥斯达黎加|英属维尔京|巴西|Brazil|智利|Chile|秘鲁|古巴|阿根廷|Argentina|乌拉圭|牙买加|苏里南|荷属库拉索|哥伦比亚|厄瓜多尔|委内瑞拉|危地马拉|波多黎各|开曼群岛|法属圭亚那|特立尼达和多巴哥|玻利维亚|海地|圭亚那|多米尼加|澳大利亚|Australia|AU|新西兰|关岛|斐济|南极)+(.*)/"
    // },
    // {
    //   "name": "Oceania",
    //   "pattern": "/^(.*)(澳大利亚|Australia|AU|新西兰|关岛|斐济|南极)+(.*)/"
    // },
    // {
    //   "name": "America",
    //   "pattern": "/^(.*)(加拿大|Canada|墨西哥|巴拿马|百慕大|格陵兰|哥斯达黎加|英属维尔京|巴西|Brazil|智利|Chile|秘鲁|古巴|阿根廷|Argentina|乌拉圭|牙买加|苏里南|荷属库拉索|哥伦比亚|厄瓜多尔|委内瑞拉|危地马拉|波多黎各|开曼群岛|法属圭亚那|特立尼达和多巴哥|玻利维亚|海地|圭亚那|多米尼加)+(.*)/"
    // },
    // {
    //   "name": "Europe",
    //   "pattern": "/^(.*)(英国|UK|Netherlands|荷兰|Russia|俄罗斯|Germany|德国|DE|France|法国|Switzerland|瑞士|Sweden|瑞典|Bulgaria|保加利亚|Austria|奥地利|Ireland|爱尔兰|Turkey|Hungary|法国|英国|马恩岛|德国|丹麦|挪威|瑞典|芬兰|冰岛|瑞士|捷克|希腊|荷兰|波兰|黑山|俄罗斯|乌克兰|匈牙利|卢森堡|奥地利|意大利|梵蒂冈|比利时|爱尔兰|立陶宛|西班牙|葡萄牙|安道尔|马耳他|摩纳哥|保加利亚|克罗地亚|北马其顿|塞尔维亚|塞浦路斯|拉脱维亚|摩尔多瓦|斯洛伐克|爱沙尼亚|白俄罗斯|罗马尼亚|直布罗陀|圣马力诺|法罗群岛|奥兰群岛|斯洛文尼亚|阿尔巴尼亚|波黑共和国|列支敦士登)+(.*)/"
    // },
    // {
    //     "name": "Africa",
    //     "pattern": "/^(.*)(法属留尼汪|埃及|加纳|南非|摩洛哥|突尼斯|肯尼亚|卢旺达|佛得角|安哥拉|尼日利亚|毛里求斯|多哥|斯威士兰|刚果|马里)+(.*)/"
    // }
]

