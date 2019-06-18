import * as THREE from 'three'
import '../lib/three/js/controls/OrbitControls'
import '../lib/three/js/loaders/FBXLoader'
import axios from 'axios'
import TWEEN from '@tweenjs/tween.js'

export default class Building {
    constructor() {
        this.cameraPosition = {x: 180, y: -150, z: 230}; // 相机位置
        this.scene = null; // 场景
        this.camera = null; // 相机
        this.renderer = null; // 渲染器
        this.controls = null; // 控制器
        this.objGroup = new THREE.Group(); // 组
        this.meshList = []; // 接受鼠标事件对象
        this.selectObject = null; // 当前选中对象
        this.loopIndex = 0; // 循环标记
        this.cameraPath = null; // 相机运动轨迹
    }

    /**
     * @desc 初始化
     * */

    init() {
        this.setScene();
        this.setCamera();
        this.setLight();
        this.setRenderer();
        this.setControl();
        this.setAxes();
        this.makeGround();
        this.loadMainModel();
        this.loadEvnModel();
        this.animat();
        this.bindMouseEvent();
    }

    /**
     * @desc 动画循环
     * */

    animat() {
        requestAnimationFrame(this.animat.bind(this));
        // this.moveCamera();
        TWEEN.update();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * @desc 添加基础灯光
     * */

    setLight() {
        let light = new THREE.AmbientLight('#8b8b8b');
        this.scene.add(light);

        let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.x = 10;
        directionalLight.position.y = 10;
        directionalLight.position.z = 10;
        this.scene.add(directionalLight);
        let helper = new THREE.DirectionalLightHelper(directionalLight, 5);
        this.scene.add(helper);
    }

    /**
     * @desc 移动相机
     * */
    moveCamera() {
        // 第一次绘制相机路径
        if (this.cameraPath === null) {
            this.cameraPath = new THREE.Path();
            this.cameraPath.moveTo(150, 0);
            this.cameraPath.lineTo(70, 0);
            let geometry = new THREE.BufferGeometry().setFromPoints(this.cameraPath.getPoints());
            let material = new THREE.LineBasicMaterial({color: 0xff0000});
            let line = new THREE.Line(geometry, material);
            line.position.z = 100;
            this.scene.add(line);
            this.progress = 0;
        } else {
            if (this.progress < 1) {
                this.progress += 0.01; // 增量 也就是说将该线端，按照1/500的比例进行分割。也就是说有500个坐标点
                let point = this.cameraPath.getPointAt(this.progress); // 从路径中拿取坐标点点
                if (point) {
                    this.camera.position.set(point.x, point.y, 100);
                }
            }
        }
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
    setCamera() {
        this.camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 1, 2000);
        this.camera.up.x = 0;
        this.camera.up.y = 0;
        this.camera.up.z = 1;
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
        this.renderer.setPixelRatio(window.devicePixelRatio * 1);
        this.renderer.sortObjects = true; // 渲染顺序
        this.renderer.setClearColor('#212121');
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementsByClassName('building')[0].appendChild(this.renderer.domElement);

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
        maps.repeat.set(15, 15); // 纹理 y,x方向重铺
        maps.needsUpdate = false; // 纹理更新
        let material = new THREE.MeshBasicMaterial({
            map: maps,
            opacity: 1,
            transparent: true,
            color: '#6f1fff'
        });
        const geometry = new THREE.PlaneGeometry(200, 200, 1, 1);
        let ground = new THREE.Mesh(geometry, material);
        ground.position.x = 0;
        ground.position.y = 0;
        ground.position.z = -1;
        this.scene.add(ground);
        ground.receiveShadow = true;
    }

    /**
     * @desc 加载主建筑模型
     * */
    loadMainModel() {
        let that = this;
        let loader = new THREE.FBXLoader();
        const color = new THREE.Color('#656bff');
        loader.load('/model/main.fbx', function (object) {
            object.rotation.x = Math.PI / 2;
            object.traverse(function (child) {
                if (child.isMesh) {
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                    child.material.color = color;
                    child.castShadow = true;
                }
            });
            that.objGroup.add(object);
            that.scene.add(that.objGroup);
        });
    }


    /**
     * @desc 加载环境模型
     * */
    loadEvnModel() {
        let that = this;
        let loader = new THREE.FBXLoader();
        const color = new THREE.Color('#616161');
        loader.load('/model/building.fbx', function (object) {
            object.rotation.x = Math.PI / 2;
            object.traverse(function (child) {
                if (child.isMesh) {
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                    child.material.color = color;
                    child.castShadow = true;
                }
            });
            that.objGroup.add(object);

            // 获取模型大小 调整位置到远点
            let box = new THREE.Box3();
            box.expandByObject(that.objGroup);

            let x = -(box.max.x - box.min.x) / 2;
            let y = -(box.max.y - box.min.y) / 2;

            that.objGroup.position.x = x;
            that.objGroup.position.y = y - 7; // 微调
        });
    }
}
