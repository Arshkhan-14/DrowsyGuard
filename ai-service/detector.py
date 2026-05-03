"""
DrowsinessDetector — Core AI Engine
Uses MediaPipe Face Mesh to extract facial landmarks and calculate:
  - Eye Aspect Ratio (EAR)
  - Mouth Aspect Ratio (MAR)
  - Head Pose (pitch, yaw, roll)
  - Blink rate, yawn frequency, drowsiness score
"""

import time
import math
import threading
from collections import deque
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Tuple, Dict

import cv2
import numpy as np
import mediapipe as mp

# ─── MediaPipe Face Mesh landmark indices ────────────────────────────────────
# Left eye
LEFT_EYE = [362, 385, 387, 263, 373, 380]
# Right eye
RIGHT_EYE = [33, 160, 158, 133, 153, 144]
# Mouth (outer)
MOUTH = [61, 291, 39, 181, 0, 17, 269, 405]
# Head pose key points
HEAD_POSE_POINTS = [1, 33, 263, 61, 291, 199]

# ─── Thresholds ──────────────────────────────────────────────────────────────
EAR_THRESHOLD_DEFAULT = 0.22
MAR_THRESHOLD = 0.65
EAR_CONSEC_FRAMES = 15       # ~0.5s at 30fps
YAWN_CONSEC_FRAMES = 10
BLINK_WINDOW_SECONDS = 60
NORMAL_BLINK_RATE = (10, 20)  # blinks/min normal range
SMOOTHING_WINDOW = 5


def euclidean(p1, p2) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def calculate_ear(landmarks, eye_indices, w, h) -> float:
    pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in eye_indices]
    # Vertical distances
    v1 = euclidean(pts[1], pts[5])
    v2 = euclidean(pts[2], pts[4])
    # Horizontal distance
    h_dist = euclidean(pts[0], pts[3])
    if h_dist == 0:
        return 0.0
    return (v1 + v2) / (2.0 * h_dist)


def calculate_mar(landmarks, mouth_indices, w, h) -> float:
    pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in mouth_indices]
    # Vertical distances (3 pairs)
    v1 = euclidean(pts[2], pts[6])
    v2 = euclidean(pts[3], pts[5])
    v3 = euclidean(pts[1], pts[7])
    # Horizontal distance
    h_dist = euclidean(pts[0], pts[4])
    if h_dist == 0:
        return 0.0
    return (v1 + v2 + v3) / (3.0 * h_dist)


def get_head_pose(landmarks, w, h) -> Tuple[float, float, float]:
    """Returns (pitch, yaw, roll) in degrees using solvePnP."""
    image_points = np.array([
        [landmarks[1].x * w, landmarks[1].y * h],    # Nose tip
        [landmarks[33].x * w, landmarks[33].y * h],   # Left eye corner
        [landmarks[263].x * w, landmarks[263].y * h], # Right eye corner
        [landmarks[61].x * w, landmarks[61].y * h],   # Left mouth corner
        [landmarks[291].x * w, landmarks[291].y * h], # Right mouth corner
        [landmarks[199].x * w, landmarks[199].y * h], # Chin
    ], dtype=np.float64)

    model_points = np.array([
        [0.0, 0.0, 0.0],
        [-30.0, -30.0, -30.0],
        [30.0, -30.0, -30.0],
        [-25.0, 20.0, -10.0],
        [25.0, 20.0, -10.0],
        [0.0, 50.0, -10.0],
    ])

    focal_length = w
    center = (w / 2, h / 2)
    camera_matrix = np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1]
    ], dtype=np.float64)
    dist_coeffs = np.zeros((4, 1))

    success, rotation_vec, _ = cv2.solvePnP(
        model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE
    )
    if not success:
        return 0.0, 0.0, 0.0

    rmat, _ = cv2.Rodrigues(rotation_vec)
    angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
    pitch, yaw, roll = angles[0], angles[1], angles[2]
    return round(pitch, 2), round(yaw, 2), round(roll, 2)


@dataclass
class DetectionResult:
    session_id: str
    timestamp: float
    face_detected: bool
    ear: float = 0.0
    mar: float = 0.0
    pitch: float = 0.0
    yaw: float = 0.0
    roll: float = 0.0
    blink_count: int = 0
    yawn_count: int = 0
    blink_rate: float = 0.0          # blinks per minute
    drowsiness_score: float = 0.0   # 0–100
    alert_level: str = "none"        # none / low / medium / high
    is_drowsy: bool = False
    is_yawning: bool = False
    eyes_closed: bool = False
    head_tilted: bool = False
    fps: float = 0.0
    frame_count: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


class DrowsinessDetector:
    """
    Stateful per-session detector. Thread-safe for concurrent frame processing.
    """

    def __init__(self, session_id: str, ear_threshold: float = EAR_THRESHOLD_DEFAULT):
        self.session_id = session_id
        self.ear_threshold = ear_threshold
        self._lock = threading.Lock()

        # MediaPipe
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        # State
        self.frame_count = 0
        self.start_time = time.time()
        self.last_frame_time = time.time()

        # EAR / drowsiness
        self.ear_counter = 0          # consecutive frames below threshold
        self.blink_count = 0
        self.blink_timestamps: deque = deque()

        # MAR / yawning
        self.mar_counter = 0
        self.yawn_count = 0
        self.last_yawn_time = 0.0

        # Smoothing buffers
        self.ear_buffer: deque = deque(maxlen=SMOOTHING_WINDOW)
        self.mar_buffer: deque = deque(maxlen=SMOOTHING_WINDOW)

        # Drowsiness history for scoring
        self.drowsy_frames = 0
        self.total_processed = 0

        # Alerts
        self.alert_timestamps: List[float] = []

    def reset(self):
        with self._lock:
            self.ear_counter = 0
            self.blink_count = 0
            self.blink_timestamps.clear()
            self.mar_counter = 0
            self.yawn_count = 0
            self.frame_count = 0
            self.start_time = time.time()
            self.drowsy_frames = 0
            self.total_processed = 0
            self.alert_timestamps.clear()
            self.ear_buffer.clear()
            self.mar_buffer.clear()

    def _smooth(self, buffer: deque, value: float) -> float:
        buffer.append(value)
        return sum(buffer) / len(buffer)

    def _get_blink_rate(self) -> float:
        """Blinks per minute over the last 60 seconds."""
        now = time.time()
        cutoff = now - BLINK_WINDOW_SECONDS
        self.blink_timestamps = deque(
            [t for t in self.blink_timestamps if t > cutoff],
            maxlen=1000
        )
        elapsed = min(now - self.start_time, BLINK_WINDOW_SECONDS)
        if elapsed < 5:
            return 0.0
        return (len(self.blink_timestamps) / elapsed) * 60.0

    def _compute_drowsiness_score(
        self, ear: float, mar: float, blink_rate: float,
        pitch: float, yaw: float, eyes_closed: bool, is_yawning: bool
    ) -> float:
        """Returns 0–100 fatigue score."""
        score = 0.0

        # EAR contribution (lower EAR → higher score)
        ear_score = max(0, (EAR_THRESHOLD_DEFAULT - ear) / EAR_THRESHOLD_DEFAULT) * 40
        score += ear_score

        # Eyes closed
        if eyes_closed:
            score += 20

        # Yawning
        if is_yawning:
            score += 20

        # Blink rate anomaly
        if blink_rate < NORMAL_BLINK_RATE[0] or blink_rate > NORMAL_BLINK_RATE[1]:
            score += 10

        # Head tilt
        if abs(pitch) > 15 or abs(yaw) > 25:
            score += 10

        return min(100.0, round(score, 1))

    def _get_alert_level(self, score: float) -> str:
        if score < 30:
            return "none"
        elif score < 55:
            return "low"
        elif score < 75:
            return "medium"
        else:
            return "high"

    def process_frame(self, frame: np.ndarray) -> DetectionResult:
        with self._lock:
            now = time.time()
            fps = 1.0 / max(now - self.last_frame_time, 0.001)
            self.last_frame_time = now
            self.frame_count += 1
            self.total_processed += 1

            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb)

            base = DetectionResult(
                session_id=self.session_id,
                timestamp=now,
                face_detected=False,
                fps=round(fps, 1),
                frame_count=self.frame_count,
                blink_count=self.blink_count,
                yawn_count=self.yawn_count,
            )

            if not results.multi_face_landmarks:
                return base

            base.face_detected = True
            landmarks = results.multi_face_landmarks[0].landmark

            # ── Calculate EAR ──────────────────────────────────────────────
            left_ear = calculate_ear(landmarks, LEFT_EYE, w, h)
            right_ear = calculate_ear(landmarks, RIGHT_EYE, w, h)
            raw_ear = (left_ear + right_ear) / 2.0
            ear = self._smooth(self.ear_buffer, raw_ear)

            # ── Calculate MAR ──────────────────────────────────────────────
            raw_mar = calculate_mar(landmarks, MOUTH, w, h)
            mar = self._smooth(self.mar_buffer, raw_mar)

            # ── Head Pose ──────────────────────────────────────────────────
            pitch, yaw_angle, roll = get_head_pose(landmarks, w, h)

            # ── Blink Detection ────────────────────────────────────────────
            eyes_closed = ear < self.ear_threshold
            if eyes_closed:
                self.ear_counter += 1
            else:
                if self.ear_counter >= 2:  # completed a blink
                    self.blink_count += 1
                    self.blink_timestamps.append(now)
                self.ear_counter = 0

            drowsy_eyes = self.ear_counter >= EAR_CONSEC_FRAMES

            # ── Yawn Detection ─────────────────────────────────────────────
            is_yawning = mar > MAR_THRESHOLD
            if is_yawning:
                self.mar_counter += 1
            else:
                if self.mar_counter >= YAWN_CONSEC_FRAMES:
                    self.yawn_count += 1
                    self.last_yawn_time = now
                self.mar_counter = 0

            # ── Head Tilt ──────────────────────────────────────────────────
            head_tilted = abs(pitch) > 15 or abs(yaw_angle) > 25

            # ── Blink Rate ─────────────────────────────────────────────────
            blink_rate = self._get_blink_rate()

            # ── Drowsiness Score & Alert ───────────────────────────────────
            score = self._compute_drowsiness_score(
                ear, mar, blink_rate, pitch, yaw_angle, eyes_closed, is_yawning
            )
            alert_level = self._get_alert_level(score)
            is_drowsy = drowsy_eyes or (score >= 55)

            if is_drowsy:
                self.drowsy_frames += 1
                if alert_level in ("medium", "high"):
                    self.alert_timestamps.append(now)

            return DetectionResult(
                session_id=self.session_id,
                timestamp=now,
                face_detected=True,
                ear=round(ear, 4),
                mar=round(mar, 4),
                pitch=pitch,
                yaw=yaw_angle,
                roll=roll,
                blink_count=self.blink_count,
                yawn_count=self.yawn_count,
                blink_rate=round(blink_rate, 1),
                drowsiness_score=score,
                alert_level=alert_level,
                is_drowsy=is_drowsy,
                is_yawning=is_yawning,
                eyes_closed=eyes_closed,
                head_tilted=head_tilted,
                fps=round(fps, 1),
                frame_count=self.frame_count,
            )

    def get_session_stats(self) -> dict:
        with self._lock:
            elapsed = time.time() - self.start_time
            avg_ear = (
                sum(self.ear_buffer) / len(self.ear_buffer) if self.ear_buffer else 0.0
            )
            return {
                "session_id": self.session_id,
                "duration_seconds": round(elapsed, 1),
                "total_frames": self.frame_count,
                "total_blinks": self.blink_count,
                "total_yawns": self.yawn_count,
                "total_alerts": len(self.alert_timestamps),
                "drowsy_frames": self.drowsy_frames,
                "drowsy_percentage": round(
                    (self.drowsy_frames / max(self.total_processed, 1)) * 100, 1
                ),
                "avg_ear": round(avg_ear, 4),
                "ear_threshold": self.ear_threshold,
            }
