<template>
    <div class="container">
        <div class="earth"></div>
    </div>
</template>

<script>
    import Earth from '../class/earth'

    export default {
        name: 'Earth',
        data: function () {
            return {
                Earth: null
            }
        },
        mounted() {
            this.Earth = new Earth();
            this.Earth.init();
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    .container {
        background-image: url("../../public/images/earth/bg.jpg");
        background-size: cover;
        background-position: 50% 50%;
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .earth {
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: fixed;
        top: 0;
        left: 0;
    }
</style>
