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

    const { scene } = useGLTF('/models/robot.glb') as any

    const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
    const [face, setFace] = useState({ x: 0.5, y: 0.5 })
    const [audioUrl, setAudioUrl] = useState("")
    const ringTopRef = useRef<THREE.Mesh | null>(null)
    const ringBottomRef = useRef<THREE.Mesh | null>(null)

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
                if (child.name.includes("Ring_Top")) ringTopRef.current = child;
                if (child.name.includes("Ring_Bottom")) ringBottomRef.current = child;
                if (child.name === "Mouth_Blue_Light_0") mouthMeshRef.current = child
                if (child.name === "Eyes_Blue_Light_0") eyesMeshRef.current = child
            }
            if (child.name === "Hand_origin") handLRef.current = child
            if (child.name === "Hand_origin.002") handRRef.current = child
        })
    }, [scene])

    // 👋 THÊM BIẾN REF ĐỂ ĐIỀU KHIỂN
    const earsMeshRef = useRef<THREE.Mesh | null>(null);

    useEffect(() => {
        if (!scene) return;
        scene.traverse((child: any) => {
            if (child.isMesh) {

                if (child.name === "Ears_Black_Matt_0") {
                    earsMeshRef.current = child;
                    child.material = child.material.clone();
                    const mat = child.material as THREE.MeshStandardMaterial;

                    mat.color.set(0x0a0a0a); // Đen rất sâu
                    mat.roughness = 0.05;   // Bóng bẩy phản chiếu ánh sáng
                    mat.metalness = 0.2;     // Một chút ánh kim

                    // 3. THÊM HIỆU ỨNG ÁNH SÁNG EMISSIVE (Tự phát sáng)
                    // Làm cho tai như một thanh Neon màu xanh Blue nhạt
                    mat.emissive.set(0x00aaff);
                    mat.emissiveIntensity = 1.0; // Biên độ ban đầu
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
        if (ringTopRef.current) {
            // Nội thử đổi .y thành .z hoặc .x nếu vẫn chưa xoay nhen
            ringTopRef.current.rotation.z = t * 2.0;
            ringTopRef.current.position.y = Math.sin(t * 1.5) * 0.1;

            const mat = ringTopRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 5 + Math.sin(t * 10) * 2;
        }

        // Vòng dưới: Xoay ngược chiều cho đẹp
        if (ringBottomRef.current) {
            ringBottomRef.current.rotation.z = -t * 1.5;
            ringBottomRef.current.position.y = Math.sin(t * 1.5 - 0.5) * 0.06;

            const mat = ringBottomRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 3 + Math.cos(t * 8) * 1.5;
        }
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
            // Tương tự cho tay phải, nhưng Luân có thể đảo ngược Cosine để 2 tay không bị đơ
            handRRef.current.rotation.x = Math.sin(t * 1.5) * 0.1;
            handRRef.current.position.y = Math.sin(t * 1.5) * 0.05;
            handRRef.current.rotation.z = 0.1 - Math.cos(t * 0.8) * 0.03;
        }
        const waveZ = Math.PI / 2 + Math.sin(t * 10) * 0.25; // Vẫy trục Z
        const idleZ = 0.1 - Math.cos(t * 0.8) * 0.03; // Trạng thái nghỉ

        if (handRRef.current) {
            // Nếu đang chào thì nhắm đến waveZ, nếu không thì về idleZ
            const targetZ = isGreeting ? waveZ : idleZ;
            const targetX = isGreeting ? -0.4 : (Math.sin(t * 1.5) * 0.1);

            // Dùng lerp để chuyển đổi giữa 2 tư thế (tốc độ 0.1 giúp tay di chuyển êm)
            handRRef.current.rotation.z = THREE.MathUtils.lerp(handRRef.current.rotation.z, targetZ, 0.1);
            handRRef.current.rotation.x = THREE.MathUtils.lerp(handRRef.current.rotation.x, targetX, 0.1);
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