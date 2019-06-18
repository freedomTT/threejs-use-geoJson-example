<template>
    <div style="text-align: center">
        home
        <ul>
            <li>
                <router-link to="/map">地图</router-link>
            </li>
            <li>
                <router-link to="/building">建筑</router-link>
            </li>
        </ul>
    </div>
</template>

<script>
    export default {
        name: 'Home',
        data: function () {
            return {}
        },
        mounted() {
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
