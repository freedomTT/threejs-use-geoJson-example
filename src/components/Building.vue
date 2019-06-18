<template>
    <div>
        <div class="building"></div>
    </div>
</template>

<script>
    import Building from '../class/building'

    export default {
        name: 'Building',
        data: function () {
            return {
                building: null
            }
        },
        mounted() {
            this.building = new Building();
            this.building.init();
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    .map {
        overflow: hidden;
    }
</style>
