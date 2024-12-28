const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const configPath = path.join(app.getPath('userData'), 'config.json');
const defaultConfig = {
    sourceFolder: '',
    exportFolder: '',
    pythonFile: 'python',
    replacementRules: [
        ['间断瓦舌', '间断布纹瓦舌'],
        ['抹断绳纹', '抹断直绳纹'],
        ['抹断交叉绳纹', '特殊'],
        ['瓦头,凸面凹棱纹+连续直绳纹', '瓦头,凸面连续直绳纹+凹棱纹'],
        ['瓦头,凸面凹棱纹+不连续直绳纹', '瓦头,凸面不连续直绳纹+凹棱纹'],
        ['瓦头,凸面凹棱纹+斜绳纹', '瓦头,凸面斜绳纹+凹棱纹'],
        ['瓦头,凸面凹棱纹+交叉绳纹', '瓦头,凸面交叉绳纹+凹棱纹'],
        ['不连续直绳纹+素面', '素面+不连续直绳纹', '筒瓦'], // 筒瓦瓦尾
        ['连续直绳纹+素面', '素面+连续直绳纹', '筒瓦'], // 筒瓦瓦尾
        ['瓦尾,凸面斜绳纹+素面', '瓦尾,凸面特殊'], // 筒瓦瓦尾
        ['瓦尾,凸面交叉绳纹+素面', '瓦尾,凸面特殊'], // 筒瓦瓦尾
        ['瓦尾,凸面抹断斜绳纹+素面', '瓦尾,凸面特殊'], // 筒瓦瓦尾
        ["素面+凹点纹", "凹点纹+素面"], // 凹点纹都在最下
        ["凹点纹+素面/", "素面+凹点纹/"], // 筒瓦
        ["竖菱格纹+凹点纹", "凹点纹+竖菱格纹"],
        ["横绳纹+凹点纹", "凹点纹+横绳纹"],
        ['外素面，凸面素面', '外素面'],
        ['抹光瓦舌，凸面凹棱纹+直绳纹', '抹光瓦舌，凸面凹棱纹'],
        ['不明/内切', '不明'],
        ['不明/不可识别', '不明'],
        ['不明/全切', '不明'],
        ['不明/压槽', '不明']
    ],
};

module.exports = {
    readConfig: () => {
        if (!fs.existsSync(configPath)) return defaultConfig;
        return {
            ...defaultConfig,
            ...JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        };
    },
    saveConfig: (data) => {
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    },
    getDefaultConfig: () => {
        return defaultConfig;
    },
    applyReplacements: (t, str) => {
        const config = module.exports.readConfig();
        if (!config.replacementRules || !Array.isArray(config.replacementRules)) {
            return str;
        }

        const s = config.replacementRules.reduce((result, rule) => {
            const [from, to, condition] = rule;
            if (typeof from === 'string' && typeof to === 'string') {
                if (condition && t === condition) {
                    return result.split(from).join(to);
                }
                if (!condition) {
                    return result.split(from).join(to);
                }
            }
            return result;
        }, str.replace(/\/#[^/]*/, '').replace(/＋/g, "+").trimEnd());

        if (t === '筒瓦' && s.includes('瓦头')) {
            if (s.includes('素面') && !s.includes('外素面')) {
                return "瓦头,不明，" + s.substring(s.indexOf('凹面'));
            }
            if (s.includes('凸面不明') || s.includes('不明瓦舌')) {
                return "瓦头,不明，" + s.substring(s.indexOf('凹面'));
            }
            if (s.includes('凸面特殊')) {
                return "瓦头,特殊，" + s.substring(s.indexOf('凹面'));
            }
        }

        return `${s.replace("凸面", "")}`;
    },
};