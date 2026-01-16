import * as THREE from "three";
import { shallowRef, watch, onUnmounted } from "vue";

interface WaveData {
    line: THREE.Line;
    geometry: THREE.BufferGeometry;
    material: THREE.LineBasicMaterial;
    index: number;
    segments: number;
    width: number;
    offset: number;
    phaseOffset: number;
    amplitude: number;
    baseZ: number;
    baseOpacity: number;
    glowPhase: number;
}

interface EffectConfig {
    name: string;
    speedMult: number;
    frequencies: number[];
    phases: number[];
    amplitudes: number[];
    smoothness: number;
}

export const useHomeWaveThree = () => {
    const homeWaveCanvasRef = shallowRef<HTMLCanvasElement | null>(null);

    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let waves: WaveData[] = [];
    let animationId: number | null = null;
    let resizeHandler: (() => void) | null = null;
    let fullscreenHandler: (() => void) | null = null;
    let resizeTimer: number | null = null;

    let speed = 0.3;
    let waveCount = 40;
    let amplitudeMultiplier = 0.8;
    let glowIntensity = 0.8;
    let periodMultiplier = 1;
    let time = 0;
    let currentEffect: keyof typeof effectConfigs = "gentle";

    // 波浪效果配置
    const effectConfigs: Record<string, EffectConfig> = {
        gentle: {
            name: "優雅緩流",
            speedMult: 0.5,
            frequencies: [0.15, 0.1, 0.08],
            phases: [0, Math.PI * 0.3, Math.PI * 0.7],
            amplitudes: [1, 0.6, 0.4],
            smoothness: 3
        },
        smooth: {
            name: "絲綢波動",
            speedMult: 0.4,
            frequencies: [0.2, 0.25, 0.15],
            phases: [0, Math.PI * 0.5, Math.PI],
            amplitudes: [0.8, 0.5, 0.3],
            smoothness: 4
        },
        ocean: {
            name: "海洋韻律",
            speedMult: 0.6,
            frequencies: [0.12, 0.18, 0.22, 0.09],
            phases: [0, Math.PI * 0.25, Math.PI * 0.6, Math.PI * 0.9],
            amplitudes: [1.2, 0.7, 0.4, 0.3],
            smoothness: 2.5
        },
        ripple: {
            name: "漣漪擴散",
            speedMult: 0.35,
            frequencies: [0.25, 0.2, 0.15, 0.1],
            phases: [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2],
            amplitudes: [0.6, 0.8, 0.7, 0.5],
            smoothness: 5
        },
        aurora: {
            name: "極光流動",
            speedMult: 0.25,
            frequencies: [0.08, 0.12, 0.16, 0.05, 0.2],
            phases: [
                0,
                Math.PI * 0.3,
                Math.PI * 0.6,
                Math.PI * 0.9,
                Math.PI * 1.3
            ],
            amplitudes: [1, 0.7, 0.5, 0.8, 0.4],
            smoothness: 6
        }
    };

    const createWaves = () => {
        if (!scene) return;

        // 清理舊的波浪
        waves.forEach((wave) => {
            scene!.remove(wave.line);
            wave.geometry.dispose();
            wave.material.dispose();
        });
        waves = [];

        const segments = 300;
        const width = 35;

        for (let i = 0; i < waveCount; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array((segments + 1) * 3);

            geometry.setAttribute(
                "position",
                new THREE.BufferAttribute(positions, 3)
            );

            const progress = i / Math.max(waveCount - 1, 1);
            const opacity = 0.15 + progress * 0.45;

            const material = new THREE.LineBasicMaterial({
                color: 0xc9a961,
                transparent: true,
                opacity: opacity,
                linewidth: 2,
                blending: THREE.AdditiveBlending
            });

            const line = new THREE.Line(geometry, material);
            scene.add(line);

            // 每條波浪有獨特的參數
            const waveData: WaveData = {
                line: line,
                geometry: geometry,
                material: material,
                index: i,
                segments: segments,
                width: width,
                offset: (i / Math.max(waveCount - 1, 1)) * Math.PI * 2,
                phaseOffset: Math.random() * Math.PI * 2,
                amplitude: (0.7 + Math.random() * 0.6) * 1.5,
                baseZ: -8 + (i / Math.max(waveCount - 1, 1)) * 16,
                baseOpacity: opacity,
                glowPhase: Math.random() * Math.PI * 2
            };

            waves.push(waveData);
        }
    };

    const updateWaves = () => {
        const config = effectConfigs[currentEffect];
        if (!config) return;

        waves.forEach((wave) => {
            const positionAttr = wave.geometry.getAttribute("position") as
                | THREE.BufferAttribute
                | undefined;
            if (!positionAttr) return;
            const positions = positionAttr.array as Float32Array;

            for (let i = 0; i <= wave.segments; i++) {
                const t = i / wave.segments;
                const x = (t - 0.5) * wave.width;

                let y = 0;

                // 多層波浪疊加產生複雜流動
                config.frequencies.forEach((freq, idx) => {
                    const phase = config.phases[idx] || 0;
                    const amp = config.amplitudes[idx] || 1;

                    const waveTime =
                        time * config.speedMult +
                        wave.offset +
                        phase +
                        wave.phaseOffset;
                    const xFactor = x * freq * periodMultiplier;

                    y +=
                        Math.sin(xFactor + waveTime) *
                        amp *
                        wave.amplitude *
                        amplitudeMultiplier;
                });

                // 添加平滑曲線
                const smoothFactor = Math.pow(
                    Math.sin(t * Math.PI),
                    config.smoothness
                );
                y *= smoothFactor;

                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = wave.baseZ;
            }

            positionAttr.needsUpdate = true;

            // 更優雅的流光效果
            wave.glowPhase += 0.01 * speed;
            const glowPosition = (time * 0.05 + wave.glowPhase) % (Math.PI * 2);
            const glowStrength =
                (Math.sin(glowPosition) * 0.5 + 0.5) * glowIntensity;

            const fadeInOut = Math.sin(glowPosition * 0.5) * 0.5 + 0.5;
            const newOpacity =
                wave.baseOpacity + glowStrength * fadeInOut * 0.35;
            wave.material.opacity = Math.min(newOpacity, 0.9);
        });
    };

    const animate = () => {
        if (!scene || !camera || !renderer) return;

        animationId = requestAnimationFrame(animate);

        time += speed * 0.015;
        updateWaves();

        // 輕微的相機移動增加沉浸感
        if (camera) {
            camera.position.y = 2 + Math.sin(time * 0.1) * 0.3;
            camera.lookAt(0, 0, 0);
        }

        renderer.render(scene, camera);
    };

    const onWindowResize = () => {
        if (!camera || !renderer || !homeWaveCanvasRef.value) return;

        // 使用視窗寬度
        const width = window.innerWidth;
        const height = width * (443 / 1928);

        console.log("width", width, "height", height);

        // 確保寬高有效
        if (width > 0 && height > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
    };

    // 防抖處理 resize 事件
    const debouncedResize = () => {
        if (resizeTimer) {
            cancelAnimationFrame(resizeTimer);
        }
        resizeTimer = requestAnimationFrame(() => {
            onWindowResize();
        });
    };

    const init = () => {
        if (!homeWaveCanvasRef.value) return;

        scene = new THREE.Scene();
        scene.background = null;
        scene.fog = new THREE.Fog(0x0e2f51, 10, 30);

        // 使用視窗寬度
        const width = window.innerWidth;
        const height = width * (443 / 1928);

        camera = new THREE.PerspectiveCamera(15, width / height, 0.1, 1000);
        camera.position.set(0, 2, 18);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({
            canvas: homeWaveCanvasRef.value,
            antialias: true,
            alpha: true
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 環境光
        const ambientLight = new THREE.AmbientLight(0xc9a961, 0.3);
        scene.add(ambientLight);

        createWaves();

        // 監聽 window resize 事件
        resizeHandler = debouncedResize;
        window.addEventListener("resize", resizeHandler);

        // 監聽全螢幕變化事件
        fullscreenHandler = debouncedResize;
        document.addEventListener("fullscreenchange", fullscreenHandler);
        document.addEventListener("webkitfullscreenchange", fullscreenHandler);
        document.addEventListener("mozfullscreenchange", fullscreenHandler);
        document.addEventListener("MSFullscreenChange", fullscreenHandler);

        animate();
    };

    const setEffect = (effect: keyof typeof effectConfigs) => {
        if (effectConfigs[effect]) {
            currentEffect = effect;
            createWaves();
        }
    };

    const setSpeed = (value: number) => {
        speed = Math.max(0, value);
    };

    const setWaveCount = (value: number) => {
        waveCount = Math.max(0, Math.round(value));
        createWaves();
    };

    const setPeriodMultiplier = (value: number) => {
        periodMultiplier = Math.max(0, value) / 100;
    };

    const setAmplitudeMultiplier = (value: number) => {
        amplitudeMultiplier = Math.max(0, value) / 100;
    };

    const setGlowIntensity = (value: number) => {
        glowIntensity = Math.min(2, Math.max(0, value));
    };

    const cleanup = () => {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        if (resizeTimer !== null) {
            cancelAnimationFrame(resizeTimer);
            resizeTimer = null;
        }

        if (resizeHandler) {
            window.removeEventListener("resize", resizeHandler);
            resizeHandler = null;
        }

        if (fullscreenHandler) {
            document.removeEventListener("fullscreenchange", fullscreenHandler);
            document.removeEventListener(
                "webkitfullscreenchange",
                fullscreenHandler
            );
            document.removeEventListener(
                "mozfullscreenchange",
                fullscreenHandler
            );
            document.removeEventListener(
                "MSFullscreenChange",
                fullscreenHandler
            );
            fullscreenHandler = null;
        }

        // 清理 Three.js 資源
        waves.forEach((wave) => {
            if (scene) {
                scene.remove(wave.line);
            }
            wave.geometry.dispose();
            wave.material.dispose();
        });
        waves = [];

        if (renderer) {
            renderer.dispose();
            renderer = null;
        }

        scene = null;
        camera = null;
    };

    watch(
        () => homeWaveCanvasRef.value,
        (canvas) => {
            cleanup();

            if (canvas) {
                init();
            }
        },
        { immediate: true }
    );

    onUnmounted(() => {
        cleanup();
    });

    return {
        homeWaveCanvasRef,
        setEffect,
        setSpeed,
        setWaveCount,
        setPeriodMultiplier,
        setAmplitudeMultiplier,
        setGlowIntensity
    };
};
