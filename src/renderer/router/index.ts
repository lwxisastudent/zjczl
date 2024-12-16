import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import Home from '../views/Home.vue';
import Config from '../views/Config.vue';
import Checker from '../views/Checker.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/config', component: Config },
  { path: '/checker', component: Checker },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
