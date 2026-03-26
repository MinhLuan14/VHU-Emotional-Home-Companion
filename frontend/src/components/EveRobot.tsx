import React, { useRef, useEffect, useState } from 'react'
import { useGLTF } from '@react-three/drei'
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
    const headRef = useRef<any>(null)

    const { scene, nodes } = useGLTF('/models/robot.glb') as any

    // ===== STATE =====
    const [lipSync, setLipSync] = useState<any[]>([])
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
    const [face, setFace] = useState({ x: 0.5, y: 0.5 })

    useEffect(() => {
        if (!scene) return

        const box = new THREE.Box3().setFromObject(scene)
        const center = box.getCenter(new THREE.Vector3())
        scene.position.sub(center)

        scene.traverse((child: any) => {
            if (child.isMesh) {

                child.material = new THREE.MeshStandardMaterial({
                    map: child.material?.map || null,
                    color: child.material?.color || new THREE.Color(1, 1, 1),
                    metalness: 0.2,
                    roughness: 0.4,
                })

                // ✅ TÌM ĐÚNG HEAD
                if (
                    child.name.toLowerCase().includes("head") ||
                    child.morphTargetDictionary
                ) {
                    headRef.current = child
                }
            }
        })

        console.log("HEAD:", headRef.current?.name)
        console.log("MORPH:", headRef.current?.morphTargetDictionary)

    }, [scene])

    // ===== FETCH BACKEND =====
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch('http://localhost:8000/api/ai/status')
                const data = await res.json()

                setLipSync(data.lip_sync || [])
                setFace(data.face || { x: 0.5, y: 0.5 })

                if (data.audio) {
                    const newAudio = new Audio(`http://localhost:8000${data.audio}`)
                    newAudio.play()
                    setAudio(newAudio)
                }
            } catch (err) {
                console.log("Fetch error:", err)
            }
        }, 500)

        return () => clearInterval(interval)
    }, [])

    // ===== APPLY MORPH HELPER =====
    const setMorph = (mesh: any, name: string, value: number, speed = 0.15) => {
        const dict = mesh.morphTargetDictionary
        const influence = mesh.morphTargetInfluences

        const idx = dict[name]

        if (idx !== undefined) {
            influence[idx] = THREE.MathUtils.lerp(
                influence[idx],
                value,
                speed
            )
        }
    }

    // ===== LIP SYNC =====
    const applyLipSync = (mesh: any, time: number) => {
        if (!lipSync || lipSync.length === 0) return

        let talking = 0

        for (let cue of lipSync) {
            if (time >= cue.time && time < cue.time + 0.25) {
                talking = 1
                break
            }
        }

        const dict = mesh.morphTargetDictionary
        const idx =
            dict['mouthOpen'] ??
            dict['Mouth_Open'] ??
            dict['viseme_aa']

        if (idx !== undefined) {
            mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
                mesh.morphTargetInfluences[idx],
                talking,
                0.3
            )
        }
    }

    // ===== MAIN LOOP =====
    useFrame((state) => {
        const mesh = headRef.current
        if (!mesh) return

        const dict = mesh.morphTargetDictionary
        const influence = mesh.morphTargetInfluences

        // 👄 LIP SYNC
        if (audio) {
            applyLipSync(mesh, audio.currentTime)
        }

        // 😀 EMOTION
        const emotion = aiData.emotion

        setMorph(mesh, "smile", emotion === "Vui" ? 1 : 0)
        setMorph(mesh, "sad", emotion === "Buồn" ? 1 : 0)
        setMorph(mesh, "angry", emotion === "Giận" ? 1 : 0)

        // 👁️ BLINK (tự nhiên)
        const eyeIdx =
            dict['eyeBlink'] ??
            dict['Eyes_Blink']

        if (eyeIdx !== undefined) {
            const blink = Math.abs(Math.sin(state.clock.elapsedTime * 1.5))

            influence[eyeIdx] = blink > 0.97
                ? THREE.MathUtils.lerp(influence[eyeIdx], 1, 0.5)
                : THREE.MathUtils.lerp(influence[eyeIdx], 0, 0.2)
        }

        // 👁️ HEAD TRACKING
        if (group.current) {
            group.current.rotation.y = THREE.MathUtils.lerp(
                group.current.rotation.y,
                (face.x - 0.5) * 1.5,
                0.1
            )

            group.current.rotation.x = THREE.MathUtils.lerp(
                group.current.rotation.x,
                (face.y - 0.5) * -1,
                0.1
            )
        }

        // 🚨 WARNING SHAKE (mượt)
        if (group.current) {
            const t = state.clock.elapsedTime

            const targetX = aiData.is_warning
                ? Math.sin(t * 20) * 0.02
                : 0

            const baseY = 0

            const targetY = baseY + (
                aiData.is_warning
                    ? Math.cos(t * 10) * 0.01
                    : Math.sin(t * 2) * 0.05
            )

            group.current.position.x = THREE.MathUtils.lerp(
                group.current.position.x,
                targetX,
                0.1
            )

            group.current.position.y = THREE.MathUtils.lerp(
                group.current.position.y,
                targetY,
                0.1
            )
        }
    })

    if (!scene) return null

    return (
        <primitive
            ref={group}
            object={scene}
            scale={4}
            position={[0, 0, 0]}
            dispose={null}
        />
    )
}

useGLTF.preload('/models/robot.glb')