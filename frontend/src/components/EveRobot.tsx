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

    useEffect(() => {
        if (!scene) return
        scene.traverse((child: any) => {
            if (child.isMesh) {
                child.material = child.material.clone();

                // --- NÂNG CẤP VỎ ROBOT ---
                // Làm cho vỏ trắng bóng bẩy như gốm sứ
                child.material.roughness = 0.1;
                child.material.metalness = 0.5;

                if (child.name.includes("Blue_Light")) {
                    child.material.emissive = child.material.color;
                    child.material.emissiveIntensity = 5; // Tăng mạnh để Bloom đẹp hơn
                }

                if (child.name === "Mouth_Blue_Light_0") mouthMeshRef.current = child
                if (child.name === "Eyes_Blue_Light_0") eyesMeshRef.current = child
            }
            if (child.name === "Hand_origin") handLRef.current = child
            if (child.name === "Hand_origin.002") handRRef.current = child
        })
    }, [scene])

    // ... (Giữ nguyên useEffect Fetch AI Status và Play Audio)
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

        // 👋 CỬ ĐỘNG TAY
        if (handLRef.current) handLRef.current.rotation.x = Math.sin(t * 1.5) * 0.1
        if (handRRef.current) handRRef.current.rotation.x = Math.sin(t * 1.5) * 0.1

        // 👁️ HEAD TRACKING
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, (face.x - 0.5) * -1.0, 0.1)
        group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, (face.y - 0.5) * -0.4, 0.1)

        // 😀 MÀU MẮT & VỊ TRÍ
        const baseY = -1.2
        if (eyesMeshRef.current) {
            const mat = eyesMeshRef.current.material as THREE.MeshStandardMaterial
            if (aiData.is_warning) {
                mat.color.set(0xff0000);
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