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


        let group = new THREE.Group();
        group.position.y = 0;
        this.scene.add(group);
        var californiaPts = [];


        // let shape = [];
        data.features.forEach(function (area, i) {
            if (i === 0) {
                area.geometry.coordinates.forEach(function (block, index) {
                    if (index === 0) {
                        block.forEach(function (cd, l) {
                            californiaPts.push(new THREE.Vector2(cd[0].toFixed(2), cd[1].toFixed(2)))
                            if (l === block.length) {
                                californiaPts.push(new THREE.Vector2(block[0][0].toFixed(2), block[0][1].toFixed(2)))
                            }
                        })
                    }
                })
            }
        })
        console.log(californiaPts)
        for (var i = 0; i < californiaPts.length; i++) californiaPts[i].multiplyScalar(0.000001);
        var californiaShape = new THREE.Shape(californiaPts);

        var geometry = new THREE.ShapeBufferGeometry(californiaShape);
        var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({side: THREE.DoubleSide}));
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        group.add(mesh);
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
        var light = new THREE.PointLight(0xffffff, 0.8);
        this.camera.add(light);
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
