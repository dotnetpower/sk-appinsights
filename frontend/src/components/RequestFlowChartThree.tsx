import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
} from "@mui/material";
import * as THREE from "three";

interface ParticleData {
  id: number;
  statusCode: number;
  duration: number;
  startTime: number;
  phase: number; // 0: incoming, 1: processing, 2: outgoing
  incomingDuration: number;
  outgoingDuration: number;
}

interface RequestEvent {
  method: string;
  path: string;
  status_code: number;
  duration: number;
  timestamp: string;
}

interface RequestFlowChartThreeProps {
  latestRequest: RequestEvent | null;
  isMobile?: boolean;
}

// GPU에서 실행될 Vertex Shader
const vertexShader = `
  uniform float time;
  uniform vec2 inPosition;
  uniform vec2 pipePosition;
  uniform vec2 outPosition;
  
  attribute float particleId;
  attribute float phase; // 0: incoming, 1: processing, 2: outgoing, -1: inactive
  attribute float startTime;
  attribute float duration;
  attribute vec3 particleColor;
  attribute vec3 responseColor;
  attribute float startOffset;
  attribute float incomingDuration;
  attribute float outgoingDuration;
  
  varying vec3 vColor;
  varying float vOpacity;
  varying float vHeadFactor;
  
  vec3 pastelFast = vec3(0.74, 0.89, 0.99);
  vec3 pastelSlow = vec3(0.99, 0.80, 0.87);
  vec3 pastelNeutral = vec3(0.82, 0.93, 0.99);
  
  // easeInOutCubic 함수 - 가속/감속 효과
  float easeInOutCubic(float t) {
    return t < 0.5 
      ? 4.0 * t * t * t 
      : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }
  
  void main() {
    // 비활성 파티클은 화면 밖으로
    if (phase < -0.5) {
      gl_Position = vec4(-10000.0, -10000.0, 0.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }
    
    float speedMix = clamp((incomingDuration - 1200.0) / 800.0, 0.0, 1.0);
    vec3 currentColor = particleColor;
    vOpacity = 1.0;
    
    gl_PointSize = 60.0; // 기본 크기
    vHeadFactor = 1.0;
    
    float elapsed = time - startTime;
    vec2 currentPos;
    vec2 startPos = vec2(inPosition.x, inPosition.y + startOffset);
    
    if (phase < 0.5) { // incoming - 개별 가속 이동
      float t = clamp(elapsed / incomingDuration, 0.0, 1.0);
      t = easeInOutCubic(t); // 가속/감속 효과
      currentPos = mix(startPos, pipePosition, t);
      gl_PointSize = 180.0;
      vHeadFactor = 1.0;
      
    } else if (phase < 1.5) { // processing - duration 동안 대기
      currentPos = pipePosition;
      // 미세한 진동 효과
      float vibration = sin(elapsed * 0.01) * 3.0;
      currentPos.y += vibration;
      gl_PointSize = 170.0; // processing 시 크게
      vHeadFactor = 0.85;
      currentColor = mix(responseColor, mix(pastelFast, pastelSlow, speedMix), 0.5);
      
    } else if (phase < 2.5) { // outgoing - 개별 가속 이동
      float t = clamp(elapsed / outgoingDuration, 0.0, 1.0);
      t = easeInOutCubic(t); // 가속/감속 효과
      currentPos = mix(pipePosition, outPosition, t);
      vOpacity = 1.0 - (t * 0.7); // 천천히 페이드아웃
      gl_PointSize = 190.0 - t * 40.0; // 이동하면서 크기 감소
      vHeadFactor = mix(1.0, 0.6, t);
      currentColor = mix(responseColor, pastelNeutral, t * 0.4);
    } else {
      // 예외 상황: 기본 위치
      currentPos = inPosition;
      vOpacity = 0.0;
    }

    vColor = currentColor;
    
    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 0.0, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// GPU에서 실행될 Fragment Shader
const fragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;
  varying float vHeadFactor;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) {
      discard;
    }
    
    vec2 headCenter = vec2(0.7, 0.5);
    float baseRadius = 0.4;
    float headRadius = baseRadius * mix(0.88, 1.02, clamp(vHeadFactor, 0.0, 1.0));
    vec2 headOffset = gl_PointCoord - headCenter;
    float r2 = dot(headOffset, headOffset);

    float coreGlow = exp(-r2 / (2.0 * pow(headRadius * 0.38, 2.0)));
    float haloGlow = exp(-r2 / (2.0 * pow(headRadius * 0.75, 2.0)));
    float featherGlow = exp(-r2 / (2.0 * pow(headRadius * 1.45, 2.0)));

    float radial = smoothstep(0.1, 0.6, sqrt(r2) / (headRadius * 1.2));
    float edgeFade = pow(1.0 - radial, 1.3);
    float directionalFade = 1.0 - clamp((headOffset.x + 0.04) * 2.5, 0.0, 0.95);
    float headAlpha = vOpacity * (coreGlow * 0.92 + haloGlow * 0.18 + featherGlow * 0.03) * edgeFade * directionalFade;

    vec3 innerColor = mix(vec3(1.0), vColor, 0.35);
    vec3 outerColor = mix(vec3(1.0), vColor, 0.05);
    vec3 headColor = mix(outerColor, innerColor, clamp(coreGlow * 1.5, 0.0, 1.0));

    float alpha = clamp(headAlpha * 1.6, 0.0, 1.0);
    vec3 color = headColor;
    gl_FragColor = vec4(color, alpha);
  }
`;

const RequestFlowChartThree: React.FC<RequestFlowChartThreeProps> = ({
  latestRequest,
  isMobile = false,
}) => {
  const [particleCount, setParticleCount] = useState(0);
  const [useDummyLogs, setUseDummyLogs] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const particlesDataRef = useRef<ParticleData[]>([]);
  const nextParticleIdRef = useRef(0);
  const simulationStartRef = useRef<number>(0);
  const simulationTimeRef = useRef<number>(0);
  const lastParticleCountRef = useRef(0);
  const lastCountUpdateRef = useRef(0);

  const MAX_PARTICLES = 50;
  const HEIGHT = isMobile ? 150 : 200;
  const COUNT_UPDATE_INTERVAL = 200; // ms 간격으로만 UI 업데이트

  // 더미 로그 상태 초기화
  useEffect(() => {
    const fetchDummyLogsStatus = async () => {
      try {
        const API_BASE_URL =
          process.env.REACT_APP_API_URL !== undefined
            ? process.env.REACT_APP_API_URL
            : process.env.NODE_ENV === "production"
            ? ""
            : "http://localhost:8000";

        const response = await fetch(
          `${API_BASE_URL}/api/v1/live-metrics/dummy-logs-status`
        );
        const data = await response.json();
        setUseDummyLogs(data.use_dummy_logs);
      } catch (error) {
        console.error("더미 로그 상태 조회 실패:", error);
      }
    };

    fetchDummyLogsStatus();
  }, []);

  // 더미 로그 토글 함수
  const handleToggleDummyLogs = async (checked: boolean) => {
    try {
      const API_BASE_URL =
        process.env.REACT_APP_API_URL !== undefined
          ? process.env.REACT_APP_API_URL
          : process.env.NODE_ENV === "production"
          ? ""
          : "http://localhost:8000";

      const response = await fetch(
        `${API_BASE_URL}/api/v1/live-metrics/toggle-dummy-logs?enabled=${checked}`,
        { method: "POST" }
      );
      const data = await response.json();
      if (data.success) {
        setUseDummyLogs(checked);
        console.log("✅ 더미 로그 토글:", data.message);
      }
    } catch (error) {
      console.error("❌ 더미 로그 토글 실패:", error);
    }
  };

  const getStatusColor = (
    statusCode: number,
    duration: number
  ): THREE.Color => {
    if (statusCode >= 500) return new THREE.Color("#f8b6c5"); // pastel rose
    if (statusCode >= 400) return new THREE.Color("#ffd6a5");
    if (duration < 100) return new THREE.Color("#b3e5fc");
    if (duration < 200) return new THREE.Color("#c5e7ff");
    if (duration < 500) return new THREE.Color("#d7ecff");
    if (duration < 1000) return new THREE.Color("#ffe5c4");
    return new THREE.Color("#ffc1c1");
  };

  const getProcessingColor = (duration: number): THREE.Color => {
    if (duration < 200) return new THREE.Color("#c8f7c5"); // pastel green
    if (duration < 500) return new THREE.Color("#fff6b7"); // pastel yellow
    return new THREE.Color("#ffc7c3"); // pastel red
  };

  // Three.js 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth || 300; // fallback for SSR or initial render

    // Scene 설정
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2332);
    sceneRef.current = scene;

    // Camera 설정 - 확장된 2D (음수 X 포함)
    const camera = new THREE.OrthographicCamera(
      -50, // left - 음수 영역 포함
      containerWidth, // right - 오른쪽 확장
      0, // top
      HEIGHT, // bottom
      -10, // near (음수 가능)
      1000 // far
    );
    camera.position.z = 0;

    // Renderer 설정
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(containerWidth, HEIGHT);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(pixelRatio);
    container.appendChild(renderer.domElement);

    if (process.env.NODE_ENV !== "production") {
      try {
        const gl = renderer.getContext();
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        const rendererName = debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER);
        const vendorName = debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
          : gl.getParameter(gl.VENDOR);
        console.info("[RequestFlowChartThree] WebGL context", {
          webgl2: renderer.capabilities.isWebGL2,
          vendor: vendorName,
          renderer: rendererName,
          pixelRatio,
          maxTextureSize: renderer.capabilities.maxTextureSize,
        });
      } catch (err) {
        console.warn(
          "[RequestFlowChartThree] WebGL capability check failed",
          err
        );
      }
    }

    // 배경 요소
    const POSITIONS = {
      IN_X: -10,
      IN_Y: HEIGHT / 2,
      PIPE_X: containerWidth / 2,
      PIPE_Y: HEIGHT / 2,
      OUT_X: containerWidth - 40,
      OUT_Y: HEIGHT / 2,
    };

    // 파티클 시작/종료 지점 (화면 밖)
    const PARTICLE_START_X = -60;
    const PARTICLE_END_X = containerWidth + 10;

    // Processing Pipeline Box
    const pipelineGeometry = new THREE.PlaneGeometry(160, 60);
    const pipelineMaterial = new THREE.MeshBasicMaterial({
      color: 0x2d4a6f,
      side: THREE.DoubleSide,
    });
    const pipelineMesh = new THREE.Mesh(pipelineGeometry, pipelineMaterial);
    pipelineMesh.position.set(POSITIONS.PIPE_X, POSITIONS.PIPE_Y, -1);
    scene.add(pipelineMesh);

    // IN Box
    const inGeometry = new THREE.PlaneGeometry(80, 60);
    const inMaterial = new THREE.MeshBasicMaterial({
      color: 0x1f4470,
      side: THREE.DoubleSide,
    });
    const inMesh = new THREE.Mesh(inGeometry, inMaterial);
    inMesh.position.set(POSITIONS.IN_X, POSITIONS.IN_Y, -1);
    scene.add(inMesh);

    // OUT Box
    const outGeometry = new THREE.PlaneGeometry(80, 60);
    const outMaterial = new THREE.MeshBasicMaterial({
      color: 0x1f4470,
      side: THREE.DoubleSide,
    });
    const outMesh = new THREE.Mesh(outGeometry, outMaterial);
    outMesh.position.set(POSITIONS.OUT_X, POSITIONS.OUT_Y, -1);
    scene.add(outMesh);

    // GPU 기반 파티클 시스템 초기화
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const particleIds = new Float32Array(MAX_PARTICLES);
    const phases = new Float32Array(MAX_PARTICLES);
    const startTimes = new Float32Array(MAX_PARTICLES);
    const durations = new Float32Array(MAX_PARTICLES);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const responseColors = new Float32Array(MAX_PARTICLES * 3);
    const startOffsets = new Float32Array(MAX_PARTICLES);
    const incomingDurations = new Float32Array(MAX_PARTICLES);
    const outgoingDurations = new Float32Array(MAX_PARTICLES);

    // 초기값 설정 - position은 IN 위치로 (셰이더가 계산함)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3] = POSITIONS.IN_X;
      positions[i * 3 + 1] = POSITIONS.IN_Y;
      positions[i * 3 + 2] = 0;
      particleIds[i] = i;
      phases[i] = -1; // 비활성
      startTimes[i] = 0;
      durations[i] = 100;
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.0;
      colors[i * 3 + 2] = 0.0;
      responseColors[i * 3] = 1.0;
      responseColors[i * 3 + 1] = 1.0;
      responseColors[i * 3 + 2] = 1.0;
      startOffsets[i] = 0;
      incomingDurations[i] = 1500;
      outgoingDurations[i] = 1500;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute(
      "particleId",
      new THREE.BufferAttribute(particleIds, 1)
    );
    const phaseAttr = new THREE.BufferAttribute(phases, 1);
    phaseAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("phase", phaseAttr);
    const startTimeAttr = new THREE.BufferAttribute(startTimes, 1);
    startTimeAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("startTime", startTimeAttr);
    const phaseArray = phaseAttr.array as Float32Array;
    const startTimeArray = startTimeAttr.array as Float32Array;
    geometry.setAttribute("duration", new THREE.BufferAttribute(durations, 1));
    geometry.setAttribute(
      "particleColor",
      new THREE.BufferAttribute(colors, 3)
    );
    geometry.setAttribute(
      "responseColor",
      new THREE.BufferAttribute(responseColors, 3)
    );
    geometry.setAttribute(
      "startOffset",
      new THREE.BufferAttribute(startOffsets, 1)
    );
    geometry.setAttribute(
      "incomingDuration",
      new THREE.BufferAttribute(incomingDurations, 1)
    );
    geometry.setAttribute(
      "outgoingDuration",
      new THREE.BufferAttribute(outgoingDurations, 1)
    );

    // ShaderMaterial with uniforms
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        inPosition: {
          value: new THREE.Vector2(PARTICLE_START_X, POSITIONS.IN_Y),
        },
        pipePosition: {
          value: new THREE.Vector2(POSITIONS.PIPE_X, POSITIONS.PIPE_Y),
        },
        outPosition: {
          value: new THREE.Vector2(PARTICLE_END_X, POSITIONS.OUT_Y),
        },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    points.position.z = 1;
    scene.add(points);
    pointsRef.current = points;

    // 애니메이션 루프 - GPU가 모든 계산 처리
    let animationFrameId: number;
    simulationStartRef.current = performance.now();

    const animate = () => {
      const rawNow = performance.now();
      const relativeNow = rawNow - simulationStartRef.current;
      simulationTimeRef.current = relativeNow;
      material.uniforms.time.value = relativeNow;

      // 파티클 페이즈 업데이트 (CPU는 페이즈 전환만 담당)
      let phaseUpdateMin = Infinity;
      let phaseUpdateMax = -1;
      let startUpdateMin = Infinity;
      let startUpdateMax = -1;

      const particles = particlesDataRef.current;
      let writeIndex = 0;
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const elapsed = relativeNow - particle.startTime;
        const particleIndex = particle.id; // GPU 버퍼의 실제 인덱스

        if (particle.phase === 0 && elapsed >= particle.incomingDuration) {
          particle.phase = 1;
          particle.startTime = relativeNow;
          phaseArray[particleIndex] = 1;
          startTimeArray[particleIndex] = relativeNow;
          phaseUpdateMin = Math.min(phaseUpdateMin, particleIndex);
          phaseUpdateMax = Math.max(phaseUpdateMax, particleIndex);
          startUpdateMin = Math.min(startUpdateMin, particleIndex);
          startUpdateMax = Math.max(startUpdateMax, particleIndex);
        } else if (particle.phase === 1 && elapsed >= particle.duration) {
          particle.phase = 2;
          particle.startTime = relativeNow;
          phaseArray[particleIndex] = 2;
          startTimeArray[particleIndex] = relativeNow;
          phaseUpdateMin = Math.min(phaseUpdateMin, particleIndex);
          phaseUpdateMax = Math.max(phaseUpdateMax, particleIndex);
          startUpdateMin = Math.min(startUpdateMin, particleIndex);
          startUpdateMax = Math.max(startUpdateMax, particleIndex);
        } else if (
          particle.phase === 2 &&
          elapsed >= particle.outgoingDuration
        ) {
          phaseArray[particleIndex] = -1; // 비활성화
          phaseUpdateMin = Math.min(phaseUpdateMin, particleIndex);
          phaseUpdateMax = Math.max(phaseUpdateMax, particleIndex);
          continue; // skip 저장
        }

        particles[writeIndex++] = particle;
      }
      particles.length = writeIndex;

      if (phaseUpdateMax >= phaseUpdateMin) {
        const phaseAttrAny = phaseAttr as any;
        phaseAttrAny.updateRange = phaseAttrAny.updateRange || {
          offset: 0,
          count: 0,
        };
        phaseAttrAny.updateRange.offset = phaseUpdateMin;
        phaseAttrAny.updateRange.count = phaseUpdateMax - phaseUpdateMin + 1;
        phaseAttr.needsUpdate = true;
      }
      if (startUpdateMax >= startUpdateMin) {
        const startAttrAny = startTimeAttr as any;
        startAttrAny.updateRange = startAttrAny.updateRange || {
          offset: 0,
          count: 0,
        };
        startAttrAny.updateRange.offset = startUpdateMin;
        startAttrAny.updateRange.count = startUpdateMax - startUpdateMin + 1;
        startTimeAttr.needsUpdate = true;
      }

      if (lastParticleCountRef.current !== writeIndex) {
        lastParticleCountRef.current = writeIndex;
        if (
          rawNow - lastCountUpdateRef.current >= COUNT_UPDATE_INTERVAL ||
          lastCountUpdateRef.current === 0
        ) {
          lastCountUpdateRef.current = rawNow;
          setParticleCount(writeIndex);
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [HEIGHT]); // Re-initialize when HEIGHT changes

  // Add new particle
  useEffect(() => {
    if (!latestRequest || !pointsRef.current) return;

    const points = pointsRef.current;
    const geometry = points.geometry as THREE.BufferGeometry;

    // MAX_PARTICLES 초과 시 가장 오래된 파티클 제거
    if (particlesDataRef.current.length >= MAX_PARTICLES) {
      particlesDataRef.current.shift();
    }

    const particleIndex = nextParticleIdRef.current % MAX_PARTICLES;
    nextParticleIdRef.current++;

    const color = getStatusColor(
      latestRequest.status_code,
      latestRequest.duration
    );

    // GPU 버퍼 업데이트
    const positionAttr = geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const phaseAttr = geometry.getAttribute("phase") as THREE.BufferAttribute;
    const startTimeAttr = geometry.getAttribute(
      "startTime"
    ) as THREE.BufferAttribute;
    const durationAttr = geometry.getAttribute(
      "duration"
    ) as THREE.BufferAttribute;
    const colorAttr = geometry.getAttribute(
      "particleColor"
    ) as THREE.BufferAttribute;
    const responseColorAttr = geometry.getAttribute(
      "responseColor"
    ) as THREE.BufferAttribute;
    const startOffsetAttr = geometry.getAttribute(
      "startOffset"
    ) as THREE.BufferAttribute;
    const incomingDurationAttr = geometry.getAttribute(
      "incomingDuration"
    ) as THREE.BufferAttribute;
    const outgoingDurationAttr = geometry.getAttribute(
      "outgoingDuration"
    ) as THREE.BufferAttribute;

    // 초기 위치를 IN으로 설정 (셰이더가 이동시킴)
    const material = points.material as THREE.ShaderMaterial;
    const inPos = material.uniforms.inPosition.value;

    if (!simulationStartRef.current) {
      return;
    }

    // 중요: uniform.time과 동기화된 시간 사용 (상대 시간축)
    let currentTime = simulationTimeRef.current;
    if (currentTime === 0) {
      currentTime = performance.now() - simulationStartRef.current;
      simulationTimeRef.current = currentTime;
    }

    const spawnOffset = (Math.random() - 0.5) * 160; // 다양한 높이에서 시작
    startOffsetAttr.setX(particleIndex, spawnOffset);

    const incomingDuration = 1200 + Math.random() * 700; // 1.2~1.9초
    const outgoingDuration = 1200 + Math.random() * 700;
    incomingDurationAttr.setX(particleIndex, incomingDuration);
    outgoingDurationAttr.setX(particleIndex, outgoingDuration);

    const particleData: ParticleData = {
      id: particleIndex,
      statusCode: latestRequest.status_code,
      duration: latestRequest.duration,
      startTime: currentTime, // GPU와 동일한 시간 사용
      phase: 0, // incoming
      incomingDuration,
      outgoingDuration,
    };
    const processingColor = getProcessingColor(latestRequest.duration);

    particlesDataRef.current.push(particleData);

    positionAttr.setXYZ(particleIndex, inPos.x, inPos.y, 0);
    phaseAttr.setX(particleIndex, 0);
    startTimeAttr.setX(particleIndex, currentTime);
    durationAttr.setX(particleIndex, latestRequest.duration);
    colorAttr.setXYZ(particleIndex, color.r, color.g, color.b);
    responseColorAttr.setXYZ(
      particleIndex,
      processingColor.r,
      processingColor.g,
      processingColor.b
    );
    startOffsetAttr.needsUpdate = true;
    incomingDurationAttr.needsUpdate = true;
    outgoingDurationAttr.needsUpdate = true;
    responseColorAttr.needsUpdate = true;

    // console.log("새 파티클 추가:", {
    //   particleIndex,
    //   phase: 0,
    //   startTime: currentTime,
    //   timeDiff: 0,
    //   duration: latestRequest.duration,
    //   inPos: { x: inPos.x, y: inPos.y },
    //   pipePos: { x: pipePos.x, y: pipePos.y },
    // });

    positionAttr.needsUpdate = true;
    phaseAttr.needsUpdate = true;
    startTimeAttr.needsUpdate = true;
    durationAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    responseColorAttr.needsUpdate = true;

    setParticleCount(particlesDataRef.current.length);
  }, [latestRequest]);

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mb: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: { xs: 1, sm: 2 },
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant={isMobile ? "subtitle1" : "h6"}>
          실시간 요청 흐름
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={useDummyLogs}
              onChange={(e) => handleToggleDummyLogs(e.target.checked)}
              color="primary"
              size={isMobile ? "small" : "medium"}
            />
          }
          label={
            <Typography variant={isMobile ? "caption" : "body2"}>
              더미 로그
            </Typography>
          }
        />
      </Box>

      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: HEIGHT,
        }}
      >
        <Box
          ref={containerRef}
          sx={{
            width: "100%",
            height: HEIGHT,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 1,
            overflow: "hidden",
            position: "relative",
            "& canvas": {
              display: "block",
              width: "100%",
              height: "100%",
            },
          }}
        />
        <Typography
          sx={{
            position: "absolute",
            left: isMobile ? 20 : 40,
            top: HEIGHT / 2,
            transform: "translate(-50%, -50%)",
            color: "rgba(255,255,255,0.9)",
            fontSize: isMobile ? 11 : 14,
            fontWeight: 600,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          IN
        </Typography>
        <Typography
          sx={{
            position: "absolute",
            left: "50%",
            top: HEIGHT / 2,
            transform: "translate(-50%, -50%)",
            color: "rgba(255,255,255,0.9)",
            fontSize: isMobile ? 11 : 14,
            fontWeight: 600,
            pointerEvents: "none",
            userSelect: "none",
            textAlign: "center",
            width: "auto",
            zIndex: 10,
          }}
        >
          {isMobile ? "Proc" : "Processing"}
        </Typography>
        <Typography
          sx={{
            position: "absolute",
            right: isMobile ? 10 : 0,
            top: HEIGHT / 2,
            transform: "translate(-50%, -50%)",
            color: "rgba(255,255,255,0.9)",
            fontSize: isMobile ? 11 : 14,
            fontWeight: 600,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          OUT
        </Typography>
      </Box>

      {/* 통계 */}
      <Box
        sx={{
          mt: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 0.5,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: isMobile ? "0.65rem" : "0.75rem" }}
        >
          활성 요청: {particleCount}
        </Typography>

        {/* 범례 */}
        <Box sx={{ display: "flex", gap: { xs: 1, sm: 2 }, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              sx={{
                width: isMobile ? 8 : 12,
                height: isMobile ? 8 : 12,
                borderRadius: "50%",
                backgroundColor: "#4caf50",
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: isMobile ? "0.6rem" : "0.75rem" }}
            >
              &lt;100ms
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              sx={{
                width: isMobile ? 8 : 12,
                height: isMobile ? 8 : 12,
                borderRadius: "50%",
                backgroundColor: "#ffc107",
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: isMobile ? "0.6rem" : "0.75rem" }}
            >
              {isMobile ? "200-500" : "200-500ms"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              sx={{
                width: isMobile ? 8 : 12,
                height: isMobile ? 8 : 12,
                borderRadius: "50%",
                backgroundColor: "#f44336",
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: isMobile ? "0.6rem" : "0.75rem" }}
            >
              {isMobile ? ">1s/Err" : ">1s / Error"}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default RequestFlowChartThree;
