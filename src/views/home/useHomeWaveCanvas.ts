import { shallowRef, watch, onUnmounted } from "vue";
import { baseUrl } from "@/config/constants";

export const useHomeWaveCanvas = () => {
    const homeWaveCanvasRef = shallowRef<HTMLCanvasElement | null>(null);
    const homeWaveCanvasBackRef = shallowRef<HTMLCanvasElement | null>(null);
    const frontSpeed = ref(4);
    let animationId: number | null = null;
    let resizeHandler: (() => void) | null = null;

    const cleanup = () => {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (resizeHandler) {
            window.removeEventListener("resize", resizeHandler);
            resizeHandler = null;
        }
    };

    // 初始化前景 canvas（正向，速度快）
    const initForegroundCanvas = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        // 設置canvas尺寸
        function resizeCanvas() {
            if (!canvas) return;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        resizeCanvas();

        // 創建圖片
        const img = new Image();
        img.src = `${baseUrl}images/home/home-wave_1.png`;
        let offset = 0;
        const speed = frontSpeed.value; // 每幀移動像素（前景速度快）
        const imgWidth = 3853;

        function animate() {
            if (!canvas || !ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 計算需要繪製幾張圖片來填滿畫布
            const numImages = Math.ceil(canvas.width / imgWidth) + 2;

            for (let i = 0; i < numImages; i++) {
                const x = (i * imgWidth - offset) % (imgWidth * 2);
                ctx.drawImage(img, x, 0, imgWidth, canvas.height);
            }

            offset += speed;
            if (offset >= imgWidth) {
                offset = 0;
            }
        }

        img.onload = () => {
            animate();
        };

        return { animate, resizeCanvas };
    };

    // 初始化後景 canvas（反向，速度慢）
    const initBackgroundCanvas = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        // 設置canvas尺寸
        function resizeCanvas() {
            if (!canvas) return;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        resizeCanvas();

        // 創建圖片
        const img = new Image();
        img.src = `${baseUrl}images/home/home-wave_1.png`;
        let offset = 3853; // 從 imgWidth 開始，實現反向效果
        const speed = frontSpeed.value * 0.8; // 每幀移動像素（後景速度慢，約前景的 40%）
        const imgWidth = 3853;

        function animate() {
            if (!canvas || !ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 確保無論 offset 為何，都從負座標開始鋪滿畫布
            // startX 會是 [-imgWidth, 0) 的值，確保第一張圖從畫布左側外開始
            const normalizedOffset =
                ((offset % imgWidth) + imgWidth) % imgWidth; // 保證正值
            let startX = -normalizedOffset;

            for (let x = startX; x < canvas.width + imgWidth; x += imgWidth) {
                ctx.drawImage(img, x, 0, imgWidth, canvas.height);
            }

            offset -= speed; // 反向：offset 減少
        }

        img.onload = () => {
            animate();
        };

        return { animate, resizeCanvas };
    };

    watch(
        () => [homeWaveCanvasRef.value, homeWaveCanvasBackRef.value] as const,
        ([foregroundCanvas, backgroundCanvas]) => {
            // 清理之前的動畫和事件監聽器
            cleanup();

            if (!foregroundCanvas || !backgroundCanvas) return;

            const foreground = initForegroundCanvas(foregroundCanvas);
            const background = initBackgroundCanvas(backgroundCanvas);

            if (!foreground || !background) return;

            // 儲存引用以避免 TypeScript 類型推斷問題
            const fg = foreground;
            const bg = background;

            // 統一的 resize 處理
            const handleResize = () => {
                fg.resizeCanvas();
                bg.resizeCanvas();
            };

            resizeHandler = handleResize;
            window.addEventListener("resize", resizeHandler);

            // 統一的動畫循環
            function animate() {
                fg.animate();
                bg.animate();
                animationId = requestAnimationFrame(animate);
            }

            animate();
        },
        { immediate: true }
    );

    onUnmounted(() => {
        cleanup();
    });

    return {
        homeWaveCanvasRef,
        homeWaveCanvasBackRef
    };
};
