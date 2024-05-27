import * as THREE from 'three'
import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree, extend} from 'react-three-fiber'
import { useTexture, KeyboardControls, useKeyboardControls, OrbitControls } from '@react-three/drei'
import { Physics, RigidBody, useRapier } from "@react-three/rapier";
import './Scene.css';
import { easing } from 'maath'

// Render a 3D cube and a dynamic camera that moves
// Camera moves to a different view for each face on the cube

export default function Scene() {
  const platform = useRef()
  const character = useRef()
  const [time, setTime] = useState(0)
    
    return (
        <div className="scene">
          <KeyboardControls 
          map={[
            {name:"forward", keys: ["ArrowUp", "w", "W"]},
            {name:"backward", keys: ["ArrowDown", "s", "S"]},
            {name:"left", keys: ["ArrowLeft", "a", "A"]},
            {name:"right", keys: ["ArrowRight", "d", "D"]}
          ]}>
            <Canvas frameloop="always" camera={{ position: [0,0,5], fov: 45 }}>
                <OrbitController characterRef={character}/>
                {/* Light */}
                <ambientLight intensity={1} />
                <directionalLight position={[-2, 1, 5]} />
                <spotLight intensity={0.5} angle={0.2} penumbra={1} position={[5, 15, 10]} />


                <Suspense>
                  <Physics gravity={[0, 0, 0]} time={time} >

                    {/* Environment */}
                    <Sphere position={[0, 1, -3]} character={character} platform={platform} time={time}/>

                    {/* Player */}
                    <Player size={[0.2, 0.2, 0.2]} color="#ff0100" character={character} platform={platform}/>
                  </Physics>
                </Suspense>


              </Canvas>
          </KeyboardControls>
        </div>
    );
}

function OrbitController(props) {
  const { camera, gl } = useThree()
  const ref = useRef()
  const characterRef = props.characterRef

  useEffect(() => {
    if (ref.current) {
      console.log(ref.current)
    }
  }, [characterRef]) 
  
  
  useFrame((state) => {
    if (!ref.current || !characterRef.current) return;

    const position = characterRef.current.translation()

    ref.current.target = new THREE.Vector3(position.x, position.y, position.z)
  })
  
  return <OrbitControls ref={ref} target={[0, 2, -3]} />

}

function Rig(props) {
    const ref = props.ref
    const {camera} = useThree()
    useFrame((state, delta) => {
      ref.current.rotation.y = -camera.rotation.y * (Math.PI * 2) // Rotate contents
      state.events.update() // Raycasts every frame rather than on pointer-move
      easing.damp3(state.camera.position, [state.pointer.x * 2, state.pointer.y + 1.5, 10], 0.3, delta) // Move camera
      //state.camera.lookAt(0, 0, 0) // Look at center
    })
    return <group ref={props.ref} {...props} />
  }

function Cube(props) {
    const ref = useRef();
    
    useEffect(() => {
        if (ref.current) {
            // Set the rotation directly
            ref.current.rotation.y = Math.PI / 2; // 45 degrees
        }
    }, []);

    return (
        <mesh ref={ref}>
            <boxGeometry args={props.size} />
            <meshPhongMaterial color={props.color}/>
        </mesh>
    )
}

function Sphere(props) {
  const sphereRef = props.platform
  const playerRef = props.character
  const texture = useTexture('/blue.jpg')
  const [,get] = useKeyboardControls()
  const {physics, beforeStepCallbacks, step, world} = useRapier()

  useFrame((state, delta) => {
    if (!playerRef.current) return

    const playerPosition = playerRef.current.translation();
    const spherePosition = sphereRef.current.translation();


    const distance = new THREE.Vector3();
    distance.subVectors(spherePosition, playerPosition)
    const direction = distance.normalize();

    //check current linear velocity of player

    const linearVelocity = playerRef.current.linvel()

    // check if linear velocity is the same as direction


    const G = 0.000001 // Gravitational constant (adjust if needed)
    const playerMass = 10
    const sphereMass = 1000

    const force = direction.multiplyScalar(Math.max(Math.min(G * playerMass * sphereMass / Math.pow(distance.length(), 2), 0.1),-0.1)); // Force equation
    playerRef.current.setAngvel({ x: 0, y: 0, z: 0 }); // Reset angular velocity
    playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }); // Reset linear velocity

    force.normalize().multiplyScalar(1).clampScalar(-1, 1)
    playerRef.current.setLinvel({x:force.x, y: force.y, z: force.z}); // Apply force to player

    step(delta)
  })

  return (
    <RigidBody ref={sphereRef} position={props.position} colliders="ball" type="fixed" mass={50} restitution={0}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial map={texture} clearcoat={0.4} clearcoatRoughness={0.9} roughness={0.4} metalness={0.2} />
      </mesh>
    </RigidBody>
  )
}



function Player(props) {
  const ref = props.character
  const [, get] = useKeyboardControls()
  const raycaster = new THREE.Raycaster()
  
  const speed = 1;
  const turnSpeed = 1.2;

  const direction = new THREE.Vector3(0, 0, 0);
  const frontVector = new THREE.Vector3(0, 0, 0);
  const sideVector = new THREE.Vector3(0, 0, 0);
  const upVector = new THREE.Vector3(0, 0, 0);

  /*
  useEffect(()=> {
    invalidate()
  }, [get()])



  */

  useFrame((state, delta) => {
    
    if (!ref.current) return

    const { forward, backward, left, right } = get()
    const velocity = ref.current.linvel()
    const position = ref.current.translation()

    const rotation = ref.current.rotation(); // Access rotation only if api exists
    

    // // Update the camera position
    // state.camera.position.x = position.x
    // state.camera.position.y = position.y + 2
    // state.camera.position.z = position.z + 5
 
    // state.camera.lookAt(new THREE.Vector3(position.x, position.y-1, position.z))

    frontVector.set(0, 0, -1);
    frontVector.applyQuaternion(ref.current.rotation());

    sideVector.set(left - right, 0, 0);

    direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(speed).clampScalar(-speed, speed);

    if (forward) {
      ref.current.setLinvel({ x: direction.x, y: direction.y, z: direction.z })
    }
    if (backward) {
      ref.current.setLinvel({ x: -direction.x, y: -direction.y, z: -direction.z })
    }
    if (left || right) {
      ref.current.setAngvel({ x: 0, y: (left-right) * turnSpeed, z: 0 })
      //ref.current.setLinvel({ x: direction.x, y: direction.y, z: direction.z })
    }

    
  });
  
  return (
    <RigidBody ref={ref} colliders="cuboid" position={[0, 2, -3]} type="dynamic" mass={10}>
      <mesh ref={ref}>
          <boxGeometry args={props.size} />
          <meshStandardMaterial color={props.color}/>
      </mesh>
    </RigidBody>
  )
}

// Utilize the normals to always make the player stand on the object. try to utilize for directional inputs as well