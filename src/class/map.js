import * as THREE from 'three'
import '../lib/three/js/controls/OrbitControls'
import axios from 'axios'
import * as d3 from 'd3-geo'

export default class GeoMap {
    constructor() {
        this.cameraPosition = {x: 100, y: 0, z: 100}; // 相机位置
        this.scene = null; // 场景
        this.camera = null; // 相机
        this.renderer = null; // 渲染器
        this.controls = null; // 控制器
        this.mapGroup = []; // 组
        this.meshList = []; // 接受鼠标事件对象
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
        this.bindMouseEvent();
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
     * @params geojson
     * */

    setMapData(data) {
        const that = this;
        let vector3json = [];
        data.features.forEach(function (features, featuresIndex) {
            const areaItems = features.geometry.coordinates;
            vector3json[featuresIndex] = {
                data: features.properties,
                mercator: []
            };
            areaItems.forEach(function (item, areaIndex) {
                vector3json[featuresIndex].mercator[areaIndex] = [];
                item.forEach(function (cp, cpIndex) {
                    let lnglat = that.lnglatToVector3(cp);
                    let vector3 = new THREE.Vector3(lnglat[0], lnglat[1], lnglat[2]).multiplyScalar(1);
                    vector3json[featuresIndex].mercator[areaIndex].push(vector3)
                })
            })
        });
        this.drewMap(vector3json)
    }

    /**
     * @desc 绘制图形
     * @param data : Geojson
     * */
    drewMap(data) {
        let that = this;
        this.mapGroup = new THREE.Group();
        this.mapGroup.position.y = 0;
        this.scene.add(that.mapGroup);
        const extrudeSettings = {
            depth: 0.4,
            bevelEnabled: false,
        };
        const blockMaterial = new THREE.MeshPhongMaterial({
            color: 0x2194ce,
            emissive: 0x072534,
            specular: 0x555555,
            shininess: 2,
            opacity: .6,
            transparent: true,
            flatShading: true
        });
        const lineMaterial = new THREE.LineBasicMaterial({color: 0x267DFF});
        data.forEach(function (areaData) {
            const areaGroup = new THREE.Group();
            areaData.mercator.forEach(function (areaItem) {
                // Draw area block
                const shape = new THREE.Shape(areaItem);
                const geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings);
                const mesh = new THREE.Mesh(geometry, blockMaterial);
                areaGroup.add(mesh);
                // Draw Line
                const lineGeometry = new THREE.Geometry();
                lineGeometry.vertices = areaItem;
                const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
                const lineMeshCp = lineMesh.clone();
                lineMeshCp.position.z = 0.4;
                areaGroup.add(lineMesh);
                areaGroup.add(lineMeshCp);
                // add mesh to meshList for mouseEvent
                that.meshList.push(mesh);
            });
            that.mapGroup.add(areaGroup);
        });
        that.scene.add(that.mapGroup);
    }

    /**
     * @desc 坐标转换
     * @param lnglat [x,y]
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

        function onWindowResize() {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }

        window.addEventListener('resize', onWindowResize.bind(this), false);
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

    /**
     * @desc 鼠标 hover 事件
     * */

    bindMouseEvent() {
        let that = this;

        function onMouseMove(event) {
            const x = (event.clientX / window.innerWidth) * 2 - 1; //标准设备横坐标
            const y = -(event.clientY / window.innerHeight) * 2 + 1; //标准设备纵坐标
            const standardVector = new THREE.Vector3(x, y, 0.5); //标准设备坐标
            //标准设备坐标转世界坐标
            const worldVector = standardVector.unproject(that.camera);
            //射线投射方向单位向量(worldVector坐标减相机位置坐标)
            const ray = worldVector.sub(that.camera.position).normalize();
            //创建射线投射器对象
            let raycaster = new THREE.Raycaster(that.camera.position, ray);
            //返回射线选中的对象
            let intersects = raycaster.intersectObjects(that.meshList);
            if (intersects.length) {
                console.log(intersects[0]);
                intersects[0].object.position.z += 1
            }
        }

        window.addEventListener('mousemove', onMouseMove, false);
    }
}
