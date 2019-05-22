<template>
    <div id="app">
        <hello-world></hello-world>
    </div>
</template>

<script>
    import HelloWorld from './components/HelloWorld.vue'

    export default {
        name: 'app',
        components: {
            HelloWorld
        }
    }
</script>

<style>
    #app {
    }
</style>
