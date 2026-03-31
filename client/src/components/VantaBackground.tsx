import { useEffect, useRef } from 'react';
import FOG from 'vanta/dist/vanta.fog.min';
import * as THREE from 'three';

export default function VantaBackground() {
  const vantaRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vantaRef.current && containerRef.current) {
      vantaRef.current = FOG({
        el: containerRef.current,
        THREE: THREE,
        // 鼠标交互
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        // 颜色配置（明亮高饱和风格）
        highlightColor: 0x3b82f6,   // 亮蓝
        midtoneColor: 0x8b5cf6,    // 亮紫
        lowlightColor: 0xec489a,   // 粉红
        baseColor: 0x0f172a,       // 深蓝紫底色
        // 动画效果
        blurFactor: 0.8,           // 朦胧感
        speed: 2.0,                // 流动速度
        zoom: 3.0                  // 云团大小
      });
    }

    return () => {
      if (vantaRef.current) {
        vantaRef.current.destroy();
        vantaRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
}