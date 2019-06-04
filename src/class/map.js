import * as THREE from 'three'
import '../lib/three/js/controls/OrbitControls'
import axios from 'axios'
import * as d3 from 'd3-geo'
import TWEEN from '@tweenjs/tween.js'

export default class GeoMap {
    constructor() {
        this.cameraPosition = {x: 100, y: 0, z: 100}; // 相机位置
        this.scene = null; // 场景
        this.camera = null; // 相机
        this.renderer = null; // 渲染器
        this.controls = null; // 控制器
        this.mapGroup = []; // 组
        this.meshList = []; // 接受鼠标事件对象
        this.selectObject = null; // 当前选中对象
    }

    /**
     * @desc 初始化
     * */

    init() {
        this.setScene();
        this.setCamera(this.cameraPosition);
        this.getLight();
        this.setRenderer();
        this.setControl();
        this.setAxes();
        this.animat();
        this.bindMouseEvent();
        this.makeGround();
    }

    /**
     * @desc 动画循环
     * */

    animat() {
        requestAnimationFrame(this.animat.bind(this));
        this.controls.update();
        TWEEN.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * @desc 获取地图
     * */

    getMap() {
        const that = this;
        axios.get('/geojson/51.min.json').then(function (res) {
            if (res.status === 200) {
                const data = res.data;
                that.setMapData(data)
            }
        })
    }

    /**
     * @desc 添加基础灯光
     * */

    getLight() {
        const pointLight = new THREE.PointLight(0xffffff, 1, 0);
        pointLight.position.set(0, 0, 5);
        this.scene.add(pointLight);

        const sphereSize = 1;
        const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
        this.scene.add(pointLightHelper);
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
            features.properties.cp = that.lnglatToVector3(features.properties.cp);
            vector3json[featuresIndex] = {
                data: features.properties,
                mercator: []
            };
            areaItems.forEach(function (item, areaIndex) {
                vector3json[featuresIndex].mercator[areaIndex] = [];
                item.forEach(function (cp, cpIndex) {
                    const lnglat = that.lnglatToVector3(cp);
                    const vector3 = new THREE.Vector3(lnglat[0], lnglat[1], lnglat[2]).multiplyScalar(1.2);
                    vector3json[featuresIndex].mercator[areaIndex].push(vector3)
                })
            })
        });
        this.drawMap(vector3json)
    }

    /**
     * @desc 绘制图形
     * @param data : Geojson
     * */
    drawMap(data) {
        let that = this;
        this.mapGroup = new THREE.Group();
        this.mapGroup.position.y = 0;
        this.scene.add(that.mapGroup);
        const extrudeSettings = {
            depth: 0.5,
            steps: 1,
            bevelSegments: 0,
            curveSegments: 1,
            bevelEnabled: false,
        };
        const blockMaterial = new THREE.MeshPhongMaterial({
            color: 0x4d00ff,
            shininess: 0,
            opacity: .9,
            transparent: true,
            wireframe: false
        });
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x9800ff
        });
        data.forEach(function (areaData) {
            let areaGroup = new THREE.Group();
            areaGroup._groupType = 'areaBlock';
            areaData.mercator.forEach(function (areaItem) {
                // Draw area block
                let shape = new THREE.Shape(areaItem);
                let geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings);
                let mesh = new THREE.Mesh(geometry, blockMaterial);
                areaGroup.add(mesh);
                // Draw Line
                let lineGeometry = new THREE.Geometry();
                lineGeometry.vertices = areaItem;
                let lineMesh = new THREE.Line(lineGeometry, lineMaterial);
                let lineMeshCp = lineMesh.clone();
                lineMeshCp.position.z = 0.5;
                areaGroup.add(lineMesh);
                areaGroup.add(lineMeshCp);
                // add mesh to meshList for mouseEvent
                that.meshList.push(mesh);
            });
            /*光柱*/
            const lightMapTexture = new THREE.TextureLoader().load('/images/light.png');
            lightMapTexture.repeat.set(1, 1); // 纹理 y,x方向重铺
            lightMapTexture.needsUpdate = false; // 纹理更新
            let lightTipGroup = new THREE.Group();
            let lightGeometry = new THREE.PlaneBufferGeometry(2, 0.5, 1);
            let lightMaterial = new THREE.MeshBasicMaterial({
                map: lightMapTexture,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthTest: false,
                transparent: true,
                opacity: 0.5
            });
            let lightPlane = new THREE.Mesh(lightGeometry, lightMaterial);
            lightPlane.rotation.y = Math.PI / 2;
            lightPlane.position.x = 0;
            lightPlane.position.y = 0;
            lightPlane.position.z = 0;
            lightTipGroup.add(lightPlane);

            let lightMeshCp = lightPlane.clone();
            lightMeshCp.rotation.x = Math.PI / 2;
            lightMeshCp.rotation.y = 0;
            lightMeshCp.rotation.z = -Math.PI / 2;
            lightTipGroup.add(lightMeshCp);

            let circleGeometry = new THREE.CircleBufferGeometry(0.2, 10);
            let circleMaterial = new THREE.MeshBasicMaterial({
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                color: 0xffffff,
                depthTest: false,
                transparent: true
            });
            let circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);
            circleMesh.position.z = -0.9;
            lightTipGroup.add(circleMesh);

            lightTipGroup.position.x = areaData.data.cp[0];
            lightTipGroup.position.y = areaData.data.cp[1];
            lightTipGroup.position.z = 1.5;
            lightTipGroup.rotation.z = Math.PI / 4;

            areaGroup.add(lightTipGroup);
            /*光柱*/
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
        // this.renderer.sortObjects = false; // 渲染顺序
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementsByClassName('map')[0].appendChild(this.renderer.domElement);

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
                if (intersects[0].object.parent && intersects[0].object.parent._groupType === 'areaBlock') {
                    if (that.selectObject !== intersects[0].object.parent) {
                        if (that.selectObject) {
                            transiform(that.selectObject.position, {
                                x: that.selectObject.position.x,
                                y: that.selectObject.position.y,
                                z: 0
                            }, 100);
                            transiform(intersects[0].object.parent.position, {
                                x: intersects[0].object.parent.position.x,
                                y: intersects[0].object.parent.position.y,
                                z: 0.8
                            }, 100);
                            that.selectObject = intersects[0].object.parent;
                        } else {
                            transiform(intersects[0].object.parent.position, {
                                x: intersects[0].object.parent.position.x,
                                y: intersects[0].object.parent.position.y,
                                z: 0.8
                            }, 100);
                            that.selectObject = intersects[0].object.parent;
                        }
                    }
                }
            }
        }

        function transiform(o, n, t) {
            let e = new TWEEN.Tween(o)
                .to(n, t)
                .start();
        }

        window.addEventListener('mousemove', onMouseMove, false);
    }

    /**
     * @desc 创建地面函数
     * */
    makeGround() {
        const maps = new THREE.TextureLoader().load('/images/bgf.png');
        maps.wrapS = maps.wrapT = THREE.RepeatWrapping;
        maps.repeat.set(90, 90); // 纹理 y,x方向重铺
        maps.needsUpdate = false; // 纹理更新
        let material = new THREE.MeshBasicMaterial({
            map: maps,
            opacity: 0.7,
            transparent: false,
            color: 0x41C9DC
        });
        const geometry = new THREE.PlaneGeometry(100, 100, 1, 1)
        let ground = new THREE.Mesh(geometry, material);
        // ground.rotation.x = 0;
        ground.position.x = 0;
        ground.position.y = 0;
        ground.position.z = -1;
        this.scene.add(ground);
        ground.receiveShadow = true;
        ground.castShadow = true;
    }
}
