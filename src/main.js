import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './App.vue'
import Home from './components/Home.vue'
import Map from './components/Map.vue'
import Building from './components/Building.vue'


Vue.config.productionTip = false

Vue.use(VueRouter)

const routes = [
    {path: '/', component: Home},
    {path: '/map', component: Map},
    {path: '/building', component: Building}
]
const router = new VueRouter({
    routes
})
new Vue({
    router,
    render: h => h(App),
}).$mount('#app')
