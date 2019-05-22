import * as THREE from 'three'
import "../lib/three/js/controls/OrbitControls"
import axios from 'axios'
import * as d3 from 'd3-geo'

export default class GeoMap {
    constructor() {
        this.scene = null; // 场景
        this.camera = null; // 相机
        this.renderer = null; // 渲染器
        this.controls = null; // 控制器
    }

    /**
     * @desc 初始化
     * */

    init() {
        this.setScene();
        this.setCamera({x: 0, y: 0, z: 100});
        this.setRenderer();
        this.setControl();
        this.setAxes();
        this.animat();
    }

    /**
     * @desc 获取地图
     * */

    getMap() {
        let that = this;
        axios.get('/geojson/100000.json').then(function (res) {
            if (res.status === 200) {
                const data = res.data;
                that.drawMap(data)
            }
        })
    }

    /**
     * @desc 绘制地图
     * */

    drawMap(data) {
        let that = this;
        data.features.forEach(function (area) {
            area.geometry.coordinates.forEach(function (block) {
                block.forEach(function (cd) {
                    let a = that.lnglatToVoctor(cd)
                })
            })
        })
    }


    /**
     * @desc 坐标转墨卡托投影
     * */

    lnglatToVoctor(lnglat) {
        if (!this.projection) {
            this.projection = d3.geoMercator().center([104.072403, 30.663341]).scale(80);
        }
        const [x, y] = this.projection([lnglat[0].toFixed(4),lnglat[1].toFixed(4)]);
        console.log(x, y)
        return [x, y, 2]
    }

    /**
     * @desc 动画循环
     * */

    animat() {
        requestAnimationFrame(this.animat.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * @desc 创建场景
     * */
    setScene() {
        this.scene = new THREE.Scene();
    }

    /**
     * @desc 创建相机
     * */
    setCamera(data) {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.up.z = 1
        const {x, y, z} = data;
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.camera);
        // this.setCameraHelper();
    }

    /**
     * @desc 创建相机辅助线
     * */
    setCameraHelper() {
        const helper = new THREE.CameraHelper(this.camera);
        this.scene.add(helper);
    }

    /**
     * @desc 创建渲染器
     * */
    setRenderer() {
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
    }

    /**
     * @desc 创建控制器
     * */
    setControl() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    }

    /**
     * @desc 创建一个xyz坐标轴
     * */
    setAxes() {
        const axes = new THREE.AxesHelper(10);
        this.scene.add(axes);
    }

}
