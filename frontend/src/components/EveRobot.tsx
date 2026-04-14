import React, { useRef, useEffect, useState } from 'react'
import { useGLTF, ContactShadows } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface EveRobotProps {
    aiData: {
        is_warning: boolean
        emotion: string
        [key: string]: any
    }
}

export function EveRobot({ aiData }: EveRobotProps) {
    const group = useRef<THREE.Group>(null)
    const mouthMeshRef = useRef<THREE.Mesh | null>(null)
    const eyesMeshRef = useRef<THREE.Mesh | null>(null)
    const handLRef = useRef<THREE.Object3D | null>(null)
    const handRRef = useRef<THREE.Object3D | null>(null)
    const earsMeshRef = useRef<THREE.Mesh | null>(null);
    const ringsRef = useRef<(THREE.Mesh | null)[]>([]);
    const { scene } = useGLTF('/models/robot.glb') as any

    const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
    const [face, setFace] = useState({ x: 0.5, y: 0.5 })
    const [audioUrl, setAudioUrl] = useState("")


    useEffect(() => {
        if (!scene) return
        scene.traverse((child: any) => {
            if (child.isMesh) {
                child.material = child.material.clone();

                child.material.roughness = 0.1;
                child.material.metalness = 0.5;

                if (child.name.includes("Blue_Light")) {
                    child.material.emissive = child.material.color;
                    child.material.emissiveIntensity = 1; // Tăng mạnh để Bloom đẹp hơn
                }
                if (child.name === "Mouth_Blue_Light_0") mouthMeshRef.current = child
                if (child.name === "Eyes_Blue_Light_0") eyesMeshRef.current = child
                if (child.isMesh && child.name.includes("Wave")) {
                    child.material = child.material.clone();

                    // Regex \d+ tìm số bất kỳ: "Wave" -> 0, "Wave.001" -> 1
                    const match = child.name.match(/\d+/);
                    const index = match ? parseInt(match[0]) : 0;

                    ringsRef.current[index] = child;

                    const mat = child.material as THREE.MeshStandardMaterial;
                    mat.emissive = new THREE.Color(0x00ffff);
                    mat.emissiveIntensity = 2;
                }
            }
            if (child.name === "hANDS") handLRef.current = child;
            if (child.name === "hANDS.002") handRRef.current = child;
        })
    }, [scene])


    useEffect(() => {
        if (!scene) return;
        scene.traverse((child: any) => {
            if (child.isMesh) {

                if (child.name === "Ears_Black_Matt_0") {
                    earsMeshRef.current = child;
                    child.material = child.material.clone();
                    const mat = child.material as THREE.MeshStandardMaterial;
                    mat.color.set(0x0a0a0a);
                    mat.roughness = 0.05;
                    mat.metalness = 0.2;
                    mat.emissive.set(0x00aaff);
                    mat.emissiveIntensity = 1.0;
                }
            }
        });
    }, [scene]);
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch('http://localhost:8000/api/ai/status')
                const data = await res.json()
                setFace(data.face || { x: 0.5, y: 0.5 })
                if (data.audio && data.audio !== audioUrl) setAudioUrl(data.audio)
            } catch (err) { console.log("Backend...") }
        }, 300)
        return () => clearInterval(interval)
    }, [audioUrl])

    useEffect(() => {
        if (!audioUrl) return
        const newAudio = new Audio(`http://localhost:8000${audioUrl}?t=${Date.now()}`)
        newAudio.play().catch(e => console.log(e))
        setAudio(newAudio)
    }, [audioUrl])

    // ===== 4. MAIN LOOP (ANIMATION) =====
    useFrame((state) => {
        if (!group.current) return
        const t = state.clock.elapsedTime
        const isGreeting = audio && !audio.paused && !audio.ended;
        if (earsMeshRef.current) {
            const t = state.clock.elapsedTime;
            const earsMat = earsMeshRef.current.material as THREE.MeshStandardMaterial;

            // Cường độ ánh sáng thay đổi nhịp nhàng theo Cosine (từ 0.5 đến 2.5)
            // Tạo cảm giác tai đang thở, Robot đang ở chế độ Idle
            earsMat.emissiveIntensity = 1.5 + Math.cos(t * 1.5) * 1.0;
        }
        ringsRef.current.filter(Boolean).forEach((ring, index) => {
            if (!ring) return;

            const t = state.clock.elapsedTime;

            // --- 1. Giữ nguyên logic di chuyển và xoay của Luân ---
            ring.position.x = 0;
            ring.position.y = -0.2; // Đặt vị trí Y cố định (hoặc dùng ring.position.y = 0; tùy robot)

            ring.rotation.x = 0;
            ring.rotation.y = 0;
            ring.rotation.z = t * (2 + index);

            const verticalRange = 1.8; // Độ xa quãng đường đi xuống
            const speed = 2.0;
            const offset = ((t * speed) + (index * 0.4)) % verticalRange;
            ring.position.z = -offset; // Giữ nguyên trục Z bay xuống của Luân

            // Tính progress (tiến trình từ 0 đến 1)
            const progress = offset / verticalRange;

            // --- 2. SỬA MÀU SẮC & NEON TẠI ĐÂY ---
            const mat = ring.material as THREE.MeshStandardMaterial;
            mat.transparent = true;
            mat.opacity = 1 - progress; // Mờ dần khi xuống dưới

            // Cài đặt dải màu (HUE): Blue đậm đến Tím
            // Xanh Blue neon: 0.65 -> Tím: 0.85
            const startHue = 0.65;
            const endHue = 0.85;

            // Tính hue hiện tại: Sẽ tịnh tiến dần từ 0.65 đến 0.85 dựa trên progress
            const currentHue = startHue + (progress * (endHue - startHue));

            // Thêm hiệu ứng nhấp nháy cho sinh động
            const baseIntensity = 5;
            const flicker = Math.sin(t * 10 + index) * 2;
            const intensity = baseIntensity + flicker;

            // setHSL(hue, bão hòa, độ sáng)
            mat.emissive.setHSL(currentHue, 0.9, 0.5); // Tăng bão hòa (0.9) cho tươi màu neon
            mat.emissiveIntensity = intensity;

            // --- 3. Giữ nguyên hiệu ứng thu nhỏ của Luân ---
            ring.scale.setScalar(1.4 * (1 - progress * 0.6));
        });

        // 👄 NHÉP MIỆNG (Noise logic mượt mà)
        if (mouthMeshRef.current) {
            let targetScale = 1.0
            if (audio && !audio.paused && !audio.ended) {
                const noise = Math.sin(t * 28) * 0.7 + Math.sin(t * 15) * 0.3
                targetScale = 1.0 + Math.abs(noise) * 2.2
            }
            mouthMeshRef.current.scale.y = THREE.MathUtils.lerp(mouthMeshRef.current.scale.y, targetScale, 0.25)
            mouthMeshRef.current.scale.x = THREE.MathUtils.lerp(mouthMeshRef.current.scale.x, targetScale * 0.8, 0.25)
        }

        // 👁️ CHỚP MẮT (Logic chớp mắt tự nhiên hơn)
        if (eyesMeshRef.current) {
            // Cứ mỗi 3-4 giây sẽ chớp một lần, mỗi lần chớp diễn ra rất nhanh
            const blinkTiming = Math.sin(t * 0.8) // Nhịp chậm để kích hoạt
            const isBlinking = blinkTiming > 0.95;

            // Nếu đang chớp thì scale Y về 0 (nhắm hẳn mắt), nếu không thì trả về 1 (mở mắt)
            const targetBlink = isBlinking ? 0.0 : 1.0;

            // Dùng lerp cực nhanh (0.5) để mắt đóng mở dứt khoát
            eyesMeshRef.current.scale.y = THREE.MathUtils.lerp(eyesMeshRef.current.scale.y, targetBlink, 0.5)
        }

        // 👋 CỬ ĐỘNG TAY (IDLE & FLOATING)
        if (handLRef.current) {
            // 1. Xoay nhẹ theo nhịp thở (trục X)
            handLRef.current.rotation.x = Math.sin(t * 1.5) * 0.1;
            // 2. Bay lên xuống nhẹ nhàng (trục Y) - giúp robot trông sinh động hơn
            handLRef.current.position.y = Math.sin(t * 1.5) * 0.05;
            // 3. Đưa ra vào một chút (trục Z)
            handLRef.current.rotation.z = -0.1 + Math.cos(t * 0.8) * 0.03;
        }
        if (handRRef.current) {
            const waveZ = Math.PI / 2 + Math.sin(t * 10) * 0.25;
            const idleZ = 0.1 - Math.cos(t * 0.8) * 0.03;

            const targetZ = isGreeting ? waveZ : idleZ;
            const targetX = isGreeting ? -0.4 : (Math.sin(t * 1.5) * 0.1);

            handRRef.current.rotation.z = THREE.MathUtils.lerp(handRRef.current.rotation.z, targetZ, 0.1);
            handRRef.current.rotation.x = THREE.MathUtils.lerp(handRRef.current.rotation.x, targetX, 0.1);
            handRRef.current.position.y = Math.sin(t * 1.5) * 0.02;
        }

        if (handLRef.current) {
            const targetZ = -0.2 + Math.cos(t * 0.8) * 0.05;
            const targetX = Math.sin(t * 1.2) * 0.1;
            handLRef.current.rotation.z = THREE.MathUtils.lerp(handLRef.current.rotation.z, targetZ, 0.1);
            handLRef.current.rotation.x = THREE.MathUtils.lerp(handLRef.current.rotation.x, targetX, 0.1);
            handLRef.current.position.y = Math.sin(t * 1.5) * 0.02;
        }
        // 👁️ HEAD TRACKING
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, (face.x - 0.5) * -1.0, 0.1)
        group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, (face.y - 0.5) * -0.4, 0.1)

        // 😀 MÀU MẮT & VỊ TRÍ
        const baseY = -1.2
        if (eyesMeshRef.current) {
            const mat = eyesMeshRef.current.material as THREE.MeshStandardMaterial
            if (aiData.is_warning) {
                mat.color.set(0x00f9f9);
                mat.emissive.set(0xff0000);
                group.current.position.y = baseY + Math.sin(t * 45) * 0.02 // Rung cảnh báo
            } else {
                // Đổi màu theo cảm xúc
                const color = aiData.emotion === "Vui" ? 0x00ff00 : (aiData.emotion === "Buồn" ? 0x0055ff : 0x00ffff);
                mat.color.set(color);
                mat.emissive.set(color);
                group.current.position.y = baseY + Math.sin(t * 1.2) * 0.04 // Bay lơ lửng
            }
        }

    })

    if (!scene) return null

    return (
        <group>
            <ContactShadows
                position={[0, -2.8, 0]}
                opacity={0.6}
                scale={10}
                blur={2.5}
                far={4}
            />

            <primitive
                ref={group}
                object={scene}
                scale={3.2}
                position={[0, -1.5, 0]}
                dispose={null}
            />
        </group>
    )
}

useGLTF.preload('/models/robot.glb')