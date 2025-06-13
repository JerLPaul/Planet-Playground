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
                <CameraController characterRef={character} platform={platform}/>
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

function CameraController(props) {
  const { camera } = useThree(); // Access the camera object
  const characterRef = props.characterRef; // Reference to the player
  const sphereRef = props.platform; // Reference to the sphere (ground)

  useFrame(() => {
    if (!characterRef.current || !sphereRef.current) return;

    // Get the player's position
    const playerPosition = characterRef.current.translation();

    // Get the sphere's position
    const spherePosition = sphereRef.current.translation();

    // Calculate the ground normal at the player's position
    const groundNormal = new THREE.Vector3();
    groundNormal.subVectors(playerPosition, spherePosition).normalize();

    // Calculate the backward direction of the player
    const backwardDirection = new THREE.Vector3(0, 0, 1); // Local backward direction
    backwardDirection.applyQuaternion(characterRef.current.rotation()); // Transform to world space

    // Combine ground normal and backward direction to position the camera
    const cameraOffset = new THREE.Vector3();
    cameraOffset.copy(groundNormal).multiplyScalar(3); // Offset above the player
    cameraOffset.add(backwardDirection.multiplyScalar(3)); // Offset behind the player

    // Set the camera position relative to the player
    const targetPosition = new THREE.Vector3(
      playerPosition.x + cameraOffset.x,
      playerPosition.y + cameraOffset.y,
      playerPosition.z + cameraOffset.z
    );
    camera.position.lerp(targetPosition, 0.1);

    // Make the camera look at the player
    camera.lookAt(new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z));
    camera.up.set(groundNormal.x, groundNormal.y, groundNormal.z); // Set camera up vector to ground normal
  });

  return null; // No visual component needed
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

    const playerRadius = 0.1;
    const sphereRadius = 0.5;
    const isOnGround = Math.abs(distance.length() - sphereRadius) <= playerRadius;
    if (!isOnGround) {

    const G = 0.00000001 // Gravitational constant (adjust if needed)
    const playerMass = 100
    const sphereMass = 1000

    const force = direction.multiplyScalar(Math.max(Math.min(G * playerMass * sphereMass / Math.pow(distance.length(), 2), 0.1),-0.1)); // Force equation
    playerRef.current.setAngvel({ x: 0, y: 0, z: 0 }); // Reset angular velocity
    playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }); // Reset linear velocity

    

    force.normalize().multiplyScalar(1).clampScalar(-1, 1); // Normalize and clamp force to a maximum value
    playerRef.current.setLinvel({x:force.x, y: force.y, z: force.z}); // Apply force to player
    }
    else {
      playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }); // Reset linear velocity when on ground
      playerRef.current.setAngvel({ x: 0, y: 0, z: 0 }); // Reset angular velocity when on ground
    }

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
  const ref = props.character;
  const sphereRef = props.platform; // Reference to the sphere (ground)
  const [, get] = useKeyboardControls();

  const speed = 1;
  const turnSpeed = 1.2;

  const direction = new THREE.Vector3(0, 0, 0);
  const frontVector = new THREE.Vector3(0, 0, 0);
  const sideVector = new THREE.Vector3(0, 0, 0);
  const groundNormal = new THREE.Vector3(0, 1, 0); // Default normal pointing up

  useFrame((state, delta) => {
    if (!ref.current || !sphereRef.current) return;

    // state.camera.position.x = position.x
    // state.camera.position.y = position.y + 2
    // state.camera.position.z = position.z + 5

    const { forward, backward, left, right } = get();
    const velocity = ref.current.linvel();
    const position = ref.current.translation();

    // Calculate the normal of the sphere at the player's position
    const spherePosition = sphereRef.current.translation();
    groundNormal.subVectors(position, spherePosition).normalize(); // Normal vector from sphere center to player
    

    if (left || right) {
      const angularVelocity = groundNormal.clone().multiplyScalar(turnSpeed * (left - right));
      ref.current.setAngvel({
        x: angularVelocity.x,
        y: angularVelocity.y,
        z: angularVelocity.z,
      });
    }

    // Handle forward/backward movement
    frontVector.set(0, 0, -1);
    frontVector.applyQuaternion(ref.current.rotation());

    direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(speed).clampScalar(-speed, speed);

    if (forward) {
      ref.current.setLinvel({ x: direction.x, y: direction.y, z: direction.z });
    }
    if (backward) {
      ref.current.setLinvel({ x: -direction.x, y: -direction.y, z: -direction.z });
    }
  });

  return (
    <RigidBody ref={ref} colliders="cuboid" position={[0, 2, -3]} type="dynamic" mass={10}>
      <mesh ref={ref}>
        <boxGeometry args={props.size} />
        <meshStandardMaterial color={props.color} />
      </mesh>
    </RigidBody>
  );
}

// Utilize the normals to always make the player stand on the object. try to utilize for directional inputs as well