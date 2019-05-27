import * as THREE from 'three'
import "../lib/three/js/controls/OrbitControls"
import axios from 'axios'
import * as d3 from 'd3-geo'

export default class GeoMap {
    constructor() {
        this.cameraPosition = {x: 100, y: 0, z: 100} // 相机位置
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
        this.setCamera(this.cameraPosition);
        this.setRenderer();
        this.setControl();
        this.setAxes();
        this.animat();
    }

    /**
     * @desc 获取地图
     * */

    getMap() {
        const that = this;
        axios.get('/geojson/51.json').then(function (res) {
            if (res.status === 200) {
                const data = res.data;
                that.setMapData(data)
            }
        })
    }

    /**
     * @desc 绘制地图
     * */

    setMapData(data) {
        const that = this;
        var vector3json = [];
        data.features.forEach(function (features) {
            const area = features.geometry.coordinates[0]
            area.forEach(function (points) {
                vector3json.push(that.lnglatToVector3(points))
            })
        })
        for (var i = 0; i < vector3json.length; i++) {
            try {
                vector3json[i] = new THREE.Vector3(vector3json[i][0], vector3json[i][1], vector3json[i][2]).multiplyScalar(0.5);
            } catch (e) {
                console.log(e)
            }
        }
        this.drewMap(vector3json)
    }

    /**
     * @desc 绘制图形
     * @param
     * */
    drewMap(data) {
        const group = new THREE.Group();
        group.position.y = 0;
        this.scene.add(group);

        let shape = new THREE.Shape(data);
        let extrudeSettings = {
            depth: 1,
            bevelEnabled: true,
        };

        let geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings);
        let material = new THREE.MeshPhongMaterial({
            color: 0x156289,
            emissive: 0x072534,
            flatShading: true
        });
        let mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
    }

    /**
     * @desc 坐标转换
     * @param lnglat[x,y]
     * */
    lnglatToVector3(lnglat) {
        if (!this.projection) {
            this.projection = d3.geoMercator().center([104.072259, 30.663403]).scale(100).translate([0, 0]);
        }
        const [x, y] = this.projection([lnglat[0], lnglat[1]])
        const z = 0;
        return [y, x, z]
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
        this.camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.up.x = 0
        this.camera.up.y = 0
        this.camera.up.z = 1
        const {x, y, z} = data;
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.camera);
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
        this.controls = new THREE.OrbitControls(this.camera);
        this.camera.position.set(this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z);
    }

    /**
     * @desc 创建一个xyz坐标轴
     * */
    setAxes() {
        const axes = new THREE.AxesHelper(100);
        this.scene.add(axes);
    }

}
