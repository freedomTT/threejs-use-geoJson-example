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
        this.getMap('/geojson/world.json', 'china');
        this.getMap('/geojson/51.min.json', 'sichuan');
        this.animat();
        this.bindMouseEvent();
    }

    /**
     * @desc 动画循环
     * */

    animat() {
        requestAnimationFrame(this.animat.bind(this));
        this.lightWave();
        // this.moveCamera();
        TWEEN.update();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * @desc 获取地图
     * */

    getMap(url, type) {
        const that = this;
        axios.get(url).then(function (res) {
            if (res.status === 200) {
                const data = res.data;
                that.setMapData(data, type)
            }
        })
    }

    /**
     * @desc 添加基础灯光
     * */

    setLight() {
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

    setMapData(data, type) {
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
                item.forEach(function (cp) {
                    const lnglat = that.lnglatToVector3(cp);
                    const vector3 = new THREE.Vector3(lnglat[0], lnglat[1], lnglat[2]).multiplyScalar(1.2);
                    vector3json[featuresIndex].mercator[areaIndex].push(vector3)
                })
            })
        });
        if (type === 'sichuan') {
            this.drawMap(vector3json)
        } else if (type === 'china') {
            this.drawChinaMap(vector3json)
        }
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
            depth: 0.8,
            steps: 1,
            bevelSegments: 0,
            curveSegments: 1,
            bevelEnabled: false,
        };
        const blockMaterial = new THREE.MeshBasicMaterial({
            color: '#3700b1',
            opacity: 0.7,
            transparent: true,
            wireframe: false
        });
        const blockSideMaterial = new THREE.MeshBasicMaterial({
            color: '#5923bc',
            opacity: 0.7,
            transparent: true,
            wireframe: false
        });
        const lineMaterial = new THREE.LineBasicMaterial({
            color: '#9800ff'
        });
        data.forEach(function (areaData) {
            let areaGroup = new THREE.Group();
            areaGroup.name = 'area';
            areaGroup._groupType = 'areaBlock';
            areaData.mercator.forEach(function (areaItem) {
                // Draw area block
                let shape = new THREE.Shape(areaItem);
                let geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings);
                let mesh = new THREE.Mesh(geometry, [blockMaterial, blockSideMaterial]);
                areaGroup.add(mesh);
                // Draw Line
                let lineGeometry = new THREE.Geometry();
                lineGeometry.vertices = areaItem;
                let lineMesh = new THREE.Line(lineGeometry, lineMaterial);
                let lineMeshCp = lineMesh.clone();
                lineMeshCp.position.z = 0.8;
                areaGroup.add(lineMesh);
                areaGroup.add(lineMeshCp);
                // add mesh to meshList for mouseEvent
                that.meshList.push(mesh);
            });
            areaGroup.add(that.lightGroup(areaData));
            areaGroup.add(that.tipsSprite(areaData));
            that.mapGroup.add(areaGroup);
        });
        that.scene.add(that.mapGroup);
    }

    /**
     * @desc 绘制图形作为背景
     * @param data : Geojson
     * */
    drawChinaMap(data) {
        let that = this;
        let mapGroup = new THREE.Group();
        mapGroup.position.y = 0;
        this.scene.add(mapGroup);
        const lineMaterial = new THREE.LineDashedMaterial({
            color: '#656565',
            dashSize: 0.1,
            gapSize: 0.2
        });
        let fakeLightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            flatShading: true,
            vertexColors: THREE.VertexColors,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
            depthTest: false,
            wireframe: false,
        });
        data.forEach(function (areaData) {
            if (areaData.data.id === '51') {
                areaData.mercator.forEach(function (areaItem) {
                    let geometry = new THREE.BufferGeometry();
                    let verticesArr = [];
                    for (let i = 0; i < areaItem.length - 1; i++) {
                        verticesArr.push(areaItem[i].x, areaItem[i].y, areaItem[i].z);
                        verticesArr.push(areaItem[i + 1].x, areaItem[i + 1].y, areaItem[i + 1].z + 5);
                        verticesArr.push(areaItem[i].x, areaItem[i].y, areaItem[i].z + 5);

                        verticesArr.push(areaItem[i].x, areaItem[i].y, areaItem[i].z);
                        verticesArr.push(areaItem[i + 1].x, areaItem[i + 1].y, areaItem[i + 1].z);
                        verticesArr.push(areaItem[i + 1].x, areaItem[i + 1].y, areaItem[i + 1].z + 5);
                    }
                    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(verticesArr), 3));
                    let count = geometry.attributes.position.count;
                    geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
                    let color = new THREE.Color();
                    let positions = geometry.attributes.position;
                    let colors = geometry.attributes.color;
                    for (let i = 0; i < count; i++) {
                        let a = positions.getZ(i) ? 0 : 1;
                        color.setHSL((268 * a) / 360, 1.0 * a, a ? 0.5 : 0.13);
                        colors.setXYZ(i, color.r, color.g, color.b);
                    }
                    let mesh = new THREE.Mesh(geometry, fakeLightMaterial);
                    mapGroup.add(mesh);
                });

            } else {
                areaData.mercator.forEach(function (areaItem) {
                    // Draw Line
                    let lineGeometry = new THREE.Geometry();
                    lineGeometry.vertices = areaItem;
                    let lineMesh = new THREE.Line(lineGeometry, lineMaterial);
                    lineMesh.computeLineDistances();
                    mapGroup.add(lineMesh);
                });
            }
        });
        that.scene.add(mapGroup);
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
        maps.repeat.set(14, 14); // 纹理 y,x方向重铺
        maps.needsUpdate = false; // 纹理更新
        let material = new THREE.MeshBasicMaterial({
            // map: maps,
            opacity: 1,
            transparent: true,
            color: '#212121'
        });
        const geometry = new THREE.PlaneGeometry(100, 100, 1, 1);
        let ground = new THREE.Mesh(geometry, material);
        ground.position.x = 0;
        ground.position.y = 0;
        ground.position.z = -1;
        this.scene.add(ground);
        ground.receiveShadow = true;
        ground.castShadow = true;
    }

    /**
     * @desc 光柱
     * */

    lightGroup(areaData) {
        /*光柱*/
        const lightMapTexture = new THREE.TextureLoader().load('/images/light.png');
        lightMapTexture.repeat.set(1, 1); // 纹理 y,x方向重铺
        lightMapTexture.needsUpdate = false; // 纹理更新
        let lightTipGroup = new THREE.Group();
        lightTipGroup.name = 'lightTipGroup'
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

        let circleGeometry = new THREE.CircleBufferGeometry(0.2, 20);
        let circleMaterial = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            color: '#ff007e',
            depthTest: false,
            transparent: true,
            opacity: 1
        });
        let circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);
        circleMesh.position.z = -0.99;

        circleMesh.renderOrder = 1;
        lightTipGroup.add(circleMesh);

        let circleCpGeometry = new THREE.CircleBufferGeometry(0.2, 20);
        let circleCpMaterial = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            color: 0xffffff,
            depthTest: false,
            transparent: true,
            opacity: 1
        });
        let circleMeshCp = new THREE.Mesh(circleCpGeometry, circleCpMaterial);
        circleMeshCp.name = 'circleMesh';
        circleMeshCp.position.z = -0.995;
        lightTipGroup.add(circleMeshCp);

        lightTipGroup.position.x = areaData.data.cp[0];
        lightTipGroup.position.y = areaData.data.cp[1];
        lightTipGroup.position.z = 1.5;
        lightTipGroup.rotation.z = Math.PI / 4;
        lightTipGroup.renderOrder = 2;

        return lightTipGroup
    }

    /**
     * @desc 地区名称 采用sprite
     * */

    tipsSprite(areaData) {
        let canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 60;
        document.body.appendChild(canvas);

        let ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.font = "50px Arial";
        ctx.textAlign = "center";
        ctx.fillText(areaData.data.name, 250, 40);

        let texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        let SpriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
        });

        let textSprite = new THREE.Sprite(SpriteMaterial);
        textSprite.position.set(areaData.data.cp[0], areaData.data.cp[1], 1);
        textSprite.scale.set(4, 0.5, 1);
        textSprite.renderOrder = 3;

        return textSprite
    }

    /**
     * @desc 光柱波纹动画
     * */

    lightWave() {
        if (this.mapGroup.children) {
            let that = this;
            if (this.loopIndex >= 1) {
                this.loopIndex = 0;
            } else {
                this.loopIndex += 0.02;
            }
            this.mapGroup.children.forEach(function (item) {
                if (item.name === 'area') {
                    item.children.forEach(function (g) {
                        if (g.name === 'lightTipGroup') {
                            g.children.forEach(function (c) {
                                if (c.name === 'circleMesh') {
                                    c.scale = {
                                        x: 4 * Math.asin(that.loopIndex) + 1,
                                        y: 4 * Math.asin(that.loopIndex) + 1,
                                        z: 4 * Math.asin(that.loopIndex) + 1
                                    };
                                    c.material.opacity = 0.3 * Math.acos(that.loopIndex) - 0.1
                                }
                            })
                        }
                    })
                }
            })
        }
    }
}
