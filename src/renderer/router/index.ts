import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import Home from '../views/Home.vue';
import Config from '../views/Config.vue';
import Checker from '../views/Checker.vue';
import Login from '../views/Login.vue';
import CardList from '../views/CardList.vue';
import Card from '../views/Card.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/config', component: Config },
  { path: '/checker', component: Checker },
  { path: '/login', component: Login },
  { path: '/cardList', component: CardList },
  { path: '/card', component: Card },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
