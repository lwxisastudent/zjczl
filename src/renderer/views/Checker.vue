<template>
    <div class="subpage">
        <Header title="检查分类" @close="goHome" />

        <div class="content">
            <div class="message" v-if="errorMessage">{{ errorMessage }}</div>
            <template v-if="conflictData">
                <div v-for="item in conflictData" :key="item" class="item-list">
                    <label style="width: 30px;">{{item.type }}</label>
                    <label style="width: 30px;">{{ item.part }}</label>
                    <label style="flex: 1;" :class="item.tumianConflict ? 'tumian conflict' : 'tumian'">{{ item.tumian }}</label>
                    <label style="flex: 1;" :class="item.aomianConflict ? 'aomian conflict' : 'aomian'">{{ item.aomian }}</label>
                </div>
            </template>
            <div class="buttons">
                <button @click="openFile">打开表格文件</button>
            </div>
            <label class="tips">点击菜单刷新按钮可重新检查</label>
        </div>
    </div>
</template>

<script>
import Header from '../components/Header.vue';

import * as XLSX from 'xlsx';
const fs = require('fs');
const { ipcRenderer, shell } = window.require('electron');

export default {
    components: {
        Header,
    },
    data() {
        return {
            dataXlsxDir: '',
            table: '',
            errorMessage: '',
            conflictData: null,
        };
    },
    mounted() {
        this.dataXlsxDir = this.$route.query.dataXlsxDir;
        this.table = this.$route.query.table;
        this.loadAndProcessExcel();
    },
    methods: {
        async goHome() {
            this.$router.push('/');
        },
        loadAndProcessExcel() {
            const fileData = fs.readFileSync(this.dataXlsxDir);
            const workbook = XLSX.read(fileData, { type: 'array' });
            const sheetName = this.table;
            const sheet = workbook.Sheets[sheetName];

            if (!sheet) {
                this.errorMessage = `未找到表格 ${sheetName}`;
                return;
            }

            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            /*
            if (!['板瓦', '筒瓦', '不明'].includes(jsonData[0][0])) {
                this.errorMessage = '表格格式不正确（可能包含表头）';
                return;
            }*/

            this.processRows(jsonData);
        },
        async processRows(data) {
            const config = await ipcRenderer.invoke('get-config');
            const banwa = [];
            const tongwa = [];

            const promises = data
                .filter(row => row[0] === '板瓦' || row[0] === '筒瓦')
                .map(async row => {
                    if (row[0] === '板瓦') {
                        const item = await ipcRenderer.invoke('apply-replacements', row[1] + ',' + row[2].replace(",", "，"));
                        if (item && !banwa.includes(item)) {
                            banwa.push(item);
                        }
                    } else if (row[0] === '筒瓦') {
                        const item = await ipcRenderer.invoke('apply-replacements', row[1] + ',' + row[2].replace(",", "，"));
                        if (item && !tongwa.includes(item)) {
                            tongwa.push(item);
                        }
                    }
                });

            await Promise.all(promises);

            this.conflictData = [];
            this.validateItems(banwa, '板瓦');
            this.validateItems(tongwa, '筒瓦');
        },
        validateItems(items, type) {
            const structureRows = type === '板瓦' ? this.banwaStructureRows : this.tongwaStructureRows;
            const structureCols = type === '板瓦' ? this.banwaStructureCols : this.tongwaStructureCols;
            console.log(structureCols);

            items.forEach(item => {
                if(!item.includes('，凹面')){
                    this.conflictData.push({
                        type,
                        part: item.split(',')[0],
                        tumian: item.split(',')[1],
                        aomian: 'undefined',
                        tumianConflict: true,
                        aomianConflict: true
                    })
                }else{
                    const [col, row] = item.split('，凹面');
                    this.conflictData.push({
                        type,
                        part: col.split(',')[0],
                        tumian: col.split(',')[1],
                        aomian: row,
                        aomianConflict: !structureRows.includes(row),
                        tumianConflict: !structureCols.includes(col) && !(type === '筒瓦' && col.includes('瓦头') && col.includes('素面')) //不管什么瓦舌，素面筒瓦瓦头都归入不明
                    })
                }
            });
        },
        openFile() {
        if (this.dataXlsxDir) {
            shell.openPath(this.dataXlsxDir).then(() => {
            }).catch((err) => {
            console.error('Error opening file:', err);
            });
        } else {
            console.error('No file path specified');
        }
        }
    },
    computed: {
        banwaStructureRows() {
            return ["布纹", "横菱格纹", "竖菱格纹", "凸点纹", "凹点纹", "小方格纹", "斜绳纹", "交叉绳纹", "横绳纹", "浅绳纹", "回字形竖菱格纹", "凹棱纹", "空行", "凸点纹+横菱格纹", "凹点纹+素面", "凹点纹+竖菱格纹", "凹点纹+横绳纹", "素面+斜绳纹", "素面+横菱格纹", "素面+竖菱格纹", "素面+小方格纹", "直绳纹+凹点纹", "直绳纹+竖菱格纹", "斜绳纹+凹点纹", "斜绳纹+竖菱格纹", "交叉绳纹+凹点纹", "交叉绳纹+竖菱格纹", "布纹+竖菱格纹", "布纹+横菱格纹", "布纹+回字形竖菱格纹", "布纹+小方格纹", "布纹+凹点纹", "空行", "素面", "不明"];
        },
        banwaStructureCols() {
            return ["瓦头,连续直绳纹", "瓦头,不连续直绳纹", "瓦头,斜绳纹", "瓦头,交叉绳纹", "瓦头,抹断直绳纹", "瓦头,抹断斜绳纹", "瓦头,抹断交叉绳纹", "瓦头,连续直绳纹+素面", "瓦头,不连续直绳纹+素面", "瓦头,斜绳纹+素面", "瓦头,交叉绳纹+素面", "瓦头,抹断直绳纹+素面", "瓦头,抹断斜绳纹+素面", "瓦头,抹断交叉绳纹+素面", "瓦头,素面+凹棱纹", "瓦头,连续直绳纹+凹棱纹", "瓦头,不连续直绳纹+凹棱纹", "瓦头,斜绳纹+凹棱纹", "瓦头,交叉绳纹+凹棱纹", "瓦头,抹断直绳纹+凹棱纹", "瓦头,抹断斜绳纹+凹棱纹", "瓦头,抹断交叉绳纹+凹棱纹", "瓦头,凹棱纹", "瓦头,素面", "瓦头,特殊", "瓦头,不明",
                "瓦身,连续直绳纹", "瓦身,不连续直绳纹", "瓦身,斜绳纹", "瓦身,交叉绳纹", "瓦身,抹断直绳纹", "瓦身,抹断斜绳纹", "瓦身,抹断交叉绳纹", "瓦身,田字方格纹", "瓦身,连续直绳纹+素面", "瓦身,不连续直绳纹+素面", "瓦身,斜绳纹+素面", "瓦身,交叉绳纹+素面", "瓦身,抹断直绳纹+素面", "瓦身,抹断斜绳纹+素面", "瓦身,抹断交叉绳纹+素面", "瓦身,凹棱纹", "瓦身,凹棱纹+直绳纹", "瓦身,凹棱纹+斜绳纹", "瓦身,凹棱纹+交叉绳纹", "瓦身,素面", "瓦身,特殊", "瓦身,不明",
                "瓦尾,连续直绳纹", "瓦尾,不连续直绳纹", "瓦尾,斜绳纹", "瓦尾,交叉绳纹", "瓦尾,抹断直绳纹", "瓦尾,抹断斜绳纹", "瓦尾,抹断交叉绳纹", "瓦尾,连续直绳纹+素面", "瓦尾,不连续直绳纹+素面", "瓦尾,斜绳纹+素面", "瓦尾,交叉绳纹+素面", "瓦尾,抹断直绳纹+素面", "瓦尾,抹断斜绳纹+素面", "瓦尾,抹断交叉绳纹+素面", "瓦尾,凹棱纹", "瓦尾,凹棱纹+直绳纹", "瓦尾,凹棱纹+斜绳纹", "瓦尾,凹棱纹+交叉绳纹", "瓦尾,素面", "瓦尾,特殊", "瓦尾,不明"];
        },
        tongwaStructureRows() {
            return [
                "深布纹/内切", "深布纹/外切", "深布纹/压槽", "深布纹/全切", "深布纹/不可识别",
                "浅布纹/内切", "浅布纹/外切", "浅布纹/压槽", "浅布纹/全切", "浅布纹/不可识别",
                "凹点纹/内切", "凹点纹/外切", "凹点纹/压槽", "凹点纹/全切", "凹点纹/不可识别",
                "凸点纹/内切", "凸点纹/外切", "凸点纹/压槽", "凸点纹/全切", "凸点纹/不可识别",
                "浅绳纹/内切", "浅绳纹/外切", "浅绳纹/压槽", "浅绳纹/全切", "浅绳纹/不可识别",
                "凹点纹+直绳纹/内切", "凹点纹+直绳纹/外切", "凹点纹+直绳纹/压槽", "凹点纹+直绳纹/全切", "凹点纹+直绳纹/不可识别",
                "素面+凹点纹/内切", "素面+凹点纹/外切", "素面+凹点纹/压槽", "素面+凹点纹/全切", "素面+凹点纹/不可识别",
                "素面+凸点纹/内切", "素面+凸点纹/外切", "素面+凸点纹/压槽", "素面+凸点纹/全切", "素面+凸点纹/不可识别",
                "凹棱纹/内切", "凹棱纹/外切", "凹棱纹/压槽", "凹棱纹/全切", "凹棱纹/不可识别",
                "横菱格纹/内切", "横菱格纹/外切", "横菱格纹/压槽", "横菱格纹/全切", "横菱格纹/不可识别",
                "竖菱格纹/内切", "竖菱格纹/外切", "竖菱格纹/压槽", "竖菱格纹/全切", "竖菱格纹/不可识别",
                "横绳纹/内切", "横绳纹/外切", "横绳纹/压槽", "横绳纹/全切", "横绳纹/不可识别",
                "素面/内切", "素面/外切", "素面/压槽", "素面/全切", "素面/不可识别", "不明"
            ];
        },
        tongwaStructureCols() {
            return ["瓦头,平滑布纹瓦舌，连续直绳纹", "瓦头,平滑布纹瓦舌，不连续直绳纹", "瓦头,平滑布纹瓦舌，斜绳纹", "瓦头,平滑布纹瓦舌，交叉绳纹", "瓦头,平滑布纹瓦舌，抹断斜绳纹", "瓦头,平滑布纹瓦舌，抹断直绳纹", "瓦头,褶皱布纹瓦舌，连续直绳纹", "瓦头,褶皱布纹瓦舌，不连续直绳纹", "瓦头,褶皱布纹瓦舌，斜绳纹", "瓦头,褶皱布纹瓦舌，交叉绳纹", "瓦头,褶皱布纹瓦舌，抹断斜绳纹", "瓦头,褶皱布纹瓦舌，抹断直绳纹", "瓦头,间断布纹瓦舌，连续直绳纹", "瓦头,间断布纹瓦舌，不连续直绳纹", "瓦头,间断布纹瓦舌，斜绳纹", "瓦头,间断布纹瓦舌，交叉绳纹", "瓦头,间断布纹瓦舌，抹断斜绳纹", "瓦头,间断布纹瓦舌，抹断直绳纹", "瓦头,间断布纹瓦舌，连续直绳纹+素面", "瓦头,间断布纹瓦舌，连续直绳纹+素面", "瓦头,抹光瓦舌，连续直绳纹", "瓦头,抹光瓦舌，不连续直绳纹", "瓦头,抹光瓦舌，斜绳纹", "瓦头,抹光瓦舌，交叉绳纹", "瓦头,抹光瓦舌，凹棱纹", "瓦头,抹光瓦舌，抹断斜绳纹", "瓦头,抹光瓦舌，抹断直绳纹", "瓦头,凹点瓦舌，连续直绳纹", "瓦头,凹点瓦舌，不连续直绳纹", "瓦头,凹点瓦舌，斜绳纹", "瓦头,凹点瓦舌，交叉绳纹", "瓦头,凹点瓦舌，凹棱纹", "瓦头,凹点瓦舌，抹断斜绳纹", "瓦头,凹点瓦舌，抹断直绳纹", "瓦头,素面", "瓦头,特殊", "瓦头,不明",
                "瓦身,连续直绳纹", "瓦身,不连续直绳纹", "瓦身,斜绳纹", "瓦身,交叉绳纹", "瓦身,抹断斜绳纹", "瓦身,抹断直绳纹", "瓦身,凹棱纹", "瓦身,凹棱纹+直绳纹", "瓦身,凹棱纹+斜绳纹", "瓦身,凹棱纹+交叉绳纹", "瓦身,素面", "瓦身,特殊", "瓦身,不明",
                "瓦尾,连续直绳纹", "瓦尾,不连续直绳纹", "瓦尾,斜绳纹", "瓦尾,交叉绳纹", "瓦尾,抹断斜绳纹", "瓦尾,抹断直绳纹", "瓦尾,素面+连续直绳纹", "瓦尾,素面+不连续直绳纹", "瓦尾,素面", "瓦尾,特殊", "瓦尾,不明"];
        }
    }
};
</script>

<style scoped>
:root {
  background-color: #FAFAFA;
}

.message {
  color: #ccc;
  display: flex;
  justify-content: center;
  height: 100px;
  align-items: center;
}

.tips {
  color: #ccc;
  display: flex;
  justify-content: center;
}

.item-list {
    display: flex;
    justify-content: space-between;
}

.item-list {
    padding: 5px;
    border-bottom: 1px solid #d3d3d3;
}

.tumian::before {
    content: '凸面';
}

.aomian::before {
    content: '凹面';
}

.conflict {
    color: red;
}

.buttons button {
    width: 150px;
}
</style>