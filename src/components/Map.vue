<template>
    <div>
        <div class="map"></div>
    </div>
</template>

<script>
    import GeoMap from '../class/map'

    export default {
        name: 'Map',
        data: function () {
            return {
                geoMap: null
            }
        },
        mounted() {
            this.geoMap = new GeoMap();
            this.geoMap.init();
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    .map {
        overflow: hidden;
    }
</style>
