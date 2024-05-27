import React, {useState, useEffect, Suspense} from 'react';
import Scene from './components/ThreeScene/Scene';
import Container from 'react-bootstrap/Container';
import Card from './components/Card/Card';
import Loader from './components/Loader/Loader';
import './App.css';


//import Container from './components/Container';
// For declaring states

function App() {
  const [showScene, setShowScene] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <div className="App">
      {/* <div className="sceneContainer"> */}

      <Container className="bg-dark text-light">
        <h1>Cube and dynamic camera demo</h1>
        <p>
          This is a simple demo to show how to use react-three-fiber to create a 3D scene with a rotating cube and a dynamic camera.
        </p>
      </Container>

      <div className="canvas-area">
        <Suspense fallback={<Loader/>}>
          <Scene />
        </Suspense>
      </div>

    </div>
  );
}

export default App;
