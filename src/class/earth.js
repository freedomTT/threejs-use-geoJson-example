import * as THREE from 'three'
import '../lib/three/js/controls/TrackballControls'

export default class GeoMap {
    constructor() {
        this.radius = 100; // 地球半径
        this.scene = null; // 场景
        this.camera = null; // 相机
        this.renderer = null; // 渲染器
        this.controls = null; // 控制器
        this.clock = null;
        this.earthImg = null;
        this.earthCtx = null;
        this.earthImgData = null;
        this.earthParticles = new THREE.Object3D();
        this.animateDots = [];
        this.hexagon = new THREE.Object3D()

        this.areas = [
            {
                name: "中国",
                position: [116.20, 39.55]
            }, {
                name: "中非共和国",
                position: [18.35, 4.23]
            }, {
                name: "智利",
                position: [-70.40, -33.24]
            }, {
                name: "乍得",
                position: [14.59, 12.10]
            }, {
                name: "赞比亚",
                position: [28.16, -15.28]
            }, {
                name: "越南",
                position: [105.55, 21.05]
            }, {
                name: "约旦",
                position: [35.52, 31.57]
            }, {
                name: "英属维尔京群岛",
                position: [-64.37, 18.27]
            }, {
                name: "英国",
                position: [-0.05, 51.36]
            }];

        this.homePosition = {
            name: "home",
            position: [104.072408, 30.663502]
        }
    }

    /**
     * @desc 初始化
     * */

    init() {
        let that = this;
        this.earthImg = document.createElement('img')
        this.earthImg.src = '/images/earth/earth.jpg'
        this.earthImg.onload = () => {
            let earthCanvas = document.createElement('canvas')
            that.earthCtx = earthCanvas.getContext('2d')
            earthCanvas.width = that.earthImg.width
            earthCanvas.height = that.earthImg.height
            that.earthCtx.drawImage(that.earthImg, 0, 0, that.earthImg.width, that.earthImg.height)
            that.earthImgData = that.earthCtx.getImageData(0, 0, that.earthImg.width, that.earthImg.height)

            that.setScene();
            that.setCamera();
            that.setRenderer();
            that.setControl();
            that.createEarth();
            // that.createEarthParticles();
            that.animate();

            setTimeout(function () {
                that.createAreaPoint();
            }, 1000)
        };
        // 阻止双指放大
        document.addEventListener('gesturestart', function (event) {
            event.preventDefault();
        });

    }

    /**
     * @desc 动画循环
     * */

    animate() {
        // 球面粒子闪烁
        // let objects = this.earthParticles.children
        // objects.forEach(obj => {
        //     let material = obj.material
        //     material.t_ += material.speed_
        //     material.opacity = (Math.sin(material.t_) * material.delta_ + material.min_) * material.opacity_coef_
        //     material.needsUpdate = true
        // })
        requestAnimationFrame(this.animate.bind(this));
        let delta = this.clock.getDelta();
        this.controls.update(delta);
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * @desc 创建场景
     * */
    setScene() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock()
    }

    /**
     * @desc 创建相机
     * */
    setCamera() {
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000)
        this.camera.position.z = 500
    }

    /**
     * @desc 创建渲染器
     * */
    setRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio * 1);
        this.renderer.sortObjects = true; // 渲染顺序
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementsByClassName('earth')[0].appendChild(this.renderer.domElement);

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
        this.controls = new THREE.TrackballControls(this.camera);
        this.controls.noPan = true
    }

    /**
     * @desc 创建地球
     * */

    createEarth() {
        let that = this;
        var earthGeo = new THREE.SphereGeometry(that.radius, 100, 100);
        var earthMater = new THREE.MeshPhongMaterial({
            map: new THREE.TextureLoader().load('/images/earth/earth3.jpg'),
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            opacity: 0.8,
            color: 0x03d98e
        });
        var earthMesh = new THREE.Mesh(earthGeo, earthMater);
        that.scene.add(earthMesh)
        // 光
        var light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
        that.scene.add(light);
    }

    /**
     * @desc 创建地球 - 点
     * */
    createEarthParticles() {
        let that = this;
        let positions = []
        let materials = []
        let sizes = []
        let mat = null
        for (let i = 0; i < 2; i++) {
            positions[i] = {
                positions: []
            }
            sizes[i] = {
                sizes: []
            }
            mat = new THREE.PointsMaterial()
            mat.size = 5
            mat.color = new THREE.Color(0x03d98e)
            mat.map = new THREE.TextureLoader().load('/images/earth/dot.png')
            mat.depthWrite = false
            mat.transparent = true
            mat.opacity = 1
            mat.side = THREE.FrontSide
            mat.blending = THREE.AdditiveBlending
            let n = i / 2
            mat.t_ = n * Math.PI * 2
            mat.speed_ = 0.05 // BLINT_SPEED
            mat.min_ = .2 * Math.random() + .5
            mat.delta_ = .1 * Math.random() + .1
            mat.opacity_coef_ = 1
            materials.push(mat)
        }
        let spherical = new THREE.Spherical
        spherical.radius = that.radius // radius
        const step = 200
        for (let i = 0; i < step; i++) {
            let vec = new THREE.Vector3
            let radians = step * (1 - Math.sin(i / step * Math.PI)) / step + .5 // 每个纬线圈内的角度均分
            for (let j = 0; j < step; j += radians) {
                let c = j / step, // 底图上的横向百分比
                    f = i / step, // 底图上的纵向百分比
                    index = Math.floor(2 * Math.random())
                let pos = positions[index]
                let size = sizes[index]
                if (isLandByUV(c, f)) { // 根据横纵百分比判断在底图中的像素值
                    spherical.theta = c * Math.PI * 2 - Math.PI / 2 // 横纵百分比转换为theta和phi夹角
                    spherical.phi = f * Math.PI // 横纵百分比转换为theta和phi夹角
                    vec.setFromSpherical(spherical) // 夹角转换为世界坐标
                    pos.positions.push(vec.x)
                    pos.positions.push(vec.y)
                    pos.positions.push(vec.z)
                    if (j % 3 === 0) {
                        size.sizes.push(6.0)
                    }
                }
            }
        }
        for (let i = 0; i < positions.length; i++) {
            let pos = positions[i],
                size = sizes[i],
                bufferGeom = new THREE.BufferGeometry,
                typedArr1 = new Float32Array(pos.positions.length),
                typedArr2 = new Float32Array(size.sizes.length)
            for (let j = 0; j < pos.positions.length; j++) {
                typedArr1[j] = pos.positions[j]
            }
            for (let j = 0; j < size.sizes.length; j++) {
                typedArr2[j] = size.sizes[j]
            }
            bufferGeom.addAttribute("position", new THREE.BufferAttribute(typedArr1, 3))
            bufferGeom.addAttribute('size', new THREE.BufferAttribute(typedArr2, 1))
            bufferGeom.computeBoundingSphere()
            let particle = new THREE.Points(bufferGeom, materials[i])
            this.earthParticles.add(particle)
        }
        this.scene.add(this.earthParticles)


        function isLandByUV(c, f) {
            if (!that.earthImgData) { // 底图数据
                console.log('data error!')
            }
            let n = parseInt(that.earthImg.width * c) // 根据横纵百分比计算图象坐标系中的坐标
            let o = parseInt(that.earthImg.height * f) // 根据横纵百分比计算图象坐标系中的坐标
            return 0 === that.earthImgData.data[4 * (o * that.earthImgData.width + n)] // 查找底图中对应像素点的rgba值并判断
        }

    }

    /**
     * @desc 绘制地区点 并且画线
     * */
    createAreaPoint() {
        let that = this;
        const HEXAGON_RADIUS = 4, CITY_RADIUS = 1, CITY_MARGIN = 1;
        const homePostion = createPosition(that.homePosition.position)
        // 球面
        let sphereGeom = new THREE.SphereGeometry(CITY_RADIUS, 20, 20),
            sphereMat = new THREE.MeshBasicMaterial({
                color: 0x03d98e,
                wireframe: true
            })
        let sphere = new THREE.Mesh(sphereGeom, sphereMat)
        that.scene.add(sphere)
        // 地标及光锥
        for (let i = 0, length = this.areas.length; i < length; i++) {
            const position = createPosition(this.areas[i].position)
            const index = Math.floor(Math.random() * 2)
            createHexagon(position, index) // 地标
            createCone(position, index) // 光锥

            // 画曲线
            let curveObject = addLines(position, homePostion);

            that.scene.add(curveObject)
        }

        function createPosition(lnglat) {
            let spherical = new THREE.Spherical
            spherical.radius = that.radius
            const lng = lnglat[0]
            const lat = lnglat[1]
            // const phi = (180 - lng) * (Math.PI / 180)
            // const theta = (90 + lat) * (Math.PI / 180)
            const theta = (lng + 90) * (Math.PI / 180)
            const phi = (90 - lat) * (Math.PI / 180)
            spherical.phi = phi
            spherical.theta = theta
            let position = new THREE.Vector3()
            position.setFromSpherical(spherical)
            return position
        }

        function createHexagon(position) {
            const color = 0xffff00;
            let hexagonLine = new THREE.CircleGeometry(HEXAGON_RADIUS, 6)
            let hexagonPlane = new THREE.CircleGeometry(HEXAGON_RADIUS - CITY_MARGIN, 6)
            let vertices = hexagonLine.vertices
            vertices.shift() // 第一个节点是中心点
            let circleLineGeom = new THREE.Geometry()
            circleLineGeom.vertices = vertices
            let materialLine = new THREE.MeshBasicMaterial({
                color: color,
                side: THREE.DoubleSide
            })
            let materialPlane = new THREE.MeshBasicMaterial({
                color: color,
                side: THREE.DoubleSide,
                opacity: 0.5
            })
            let circleLine = new THREE.LineLoop(circleLineGeom, materialLine)
            let circlePlane = new THREE.Mesh(hexagonPlane, materialPlane)
            circleLine.position.copy(position)
            circlePlane.position.copy(position)
            circlePlane.lookAt(new THREE.Vector3(0, 0, 0))
            circleLine.lookAt(new THREE.Vector3(0, 0, 0))

            that.hexagon.add(circleLine)
            that.hexagon.add(circlePlane)
            that.scene.add(that.hexagon)
        }

        function createCone(position, index) {
            let texture = new THREE.TextureLoader().load('/images/earth/lightray_yellow.jpg'),
                material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    depthTest: false,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending
                }),
                height = Math.random() * 30,
                geometry = new THREE.PlaneGeometry(HEXAGON_RADIUS * 2, height),
                matrix1 = new THREE.Matrix4,
                plane1 = new THREE.Mesh(geometry, material)
            matrix1.makeRotationX(Math.PI / 2)
            matrix1.setPosition(new THREE.Vector3(0, 0, height / -2))
            geometry.applyMatrix(matrix1)
            let plane2 = plane1.clone()
            plane2.rotation.z = Math.PI / 2
            plane1.add(plane2)
            plane1.position.copy(position)
            plane1.lookAt(0, 0, 0)
            that.scene.add(plane1)
        }


        // 画线
        function addLines(v0, v3) {
            // 夹角
            let angle = (v0.angleTo(v3) * 180) / Math.PI / 10; // 0 ~ Math.PI
            let aLen = angle * 10,
                hLen = angle * angle * 120;
            let p0 = new THREE.Vector3(0, 0, 0);

            // 开始，结束点
            // var v0 = groupDots.children[0].position;
            // var v3 = groupDots.children[1].position;

            // 法线向量
            let rayLine = new THREE.Ray(p0, getVCenter(v0.clone(), v3.clone()));

            // 顶点坐标
            let vtop = rayLine.at(hLen / rayLine.at(1).distanceTo(p0));

            // 控制点坐标
            let v1 = getLenVcetor(v0.clone(), vtop, aLen);
            let v2 = getLenVcetor(v3.clone(), vtop, aLen);

            // 绘制贝塞尔曲线
            let curve = new THREE.CubicBezierCurve3(v0, v1, v2, v3);
            let geometry = new THREE.Geometry();
            geometry.vertices = curve.getPoints(50);
            let material = new THREE.LineBasicMaterial({
                color: 0xff0000,
                alphaTest: false,
                depthTest: true,
            });
            // for 点动画
            that.animateDots.push(curve.getPoints(100));
            // Create the final object to add to the scene
            return new THREE.Line(geometry, material)
        }

        // 计算v1,v2 的中点
        function getVCenter(v1, v2) {
            let v = v1.add(v2);
            return v.divideScalar(2);
        }

        // 计算V1，V2向量固定长度的点
        function getLenVcetor(v1, v2, len) {
            let v1v2Len = v1.distanceTo(v2);
            return v1.lerp(v2, len / v1v2Len);
        }

        function dotAnimate() {
            var aGroup = new THREE.Group();
            for (let i = 0; i < that.animateDots.length; i++) {
                let aGeo = new THREE.SphereGeometry(2, 10, 10);
                let aMater = new THREE.MeshPhongMaterial({color: 0xff0000});
                let aMesh = new THREE.Mesh(aGeo, aMater);
                aGroup.add(aMesh);
            }

            var vIndex = 0;

            function animateLine() {
                aGroup.children.forEach((elem, index) => {
                    let v = that.animateDots[index][vIndex];
                    elem.position.set(v.x, v.y, v.z);
                });
                vIndex++;
                if (vIndex > 100) {
                    vIndex = 0;
                }
                requestAnimationFrame(animateLine);
            }

            that.scene.add(aGroup);
            animateLine();
        }

        dotAnimate();
    }
}
