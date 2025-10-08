import type { Landmark, Handedness } from '@mediapipe/tasks-vision';

// Landmark indices
const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_FINGER_MCP = 5;
const INDEX_FINGER_PIP = 6;
const INDEX_FINGER_DIP = 7;
const INDEX_FINGER_TIP = 8;
const MIDDLE_FINGER_MCP = 9;
const MIDDLE_FINGER_PIP = 10;
const MIDDLE_FINGER_DIP = 11;
const MIDDLE_FINGER_TIP = 12;
const RING_FINGER_MCP = 13;
const RING_FINGER_PIP = 14;
const RING_FINGER_DIP = 15;
const RING_FINGER_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_DIP = 19;
const PINKY_TIP = 20;

// Function to calculate the angle between three points
function getAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

export function countFingers(landmarks: Landmark[][], handedness: Handedness[]): number {
  if (!landmarks || landmarks.length === 0) {
    return 0;
  }

  let totalFingers = 0;

  for (let i = 0; i < landmarks.length; i++) {
    const handLandmarks = landmarks[i];
    let raisedFingers = 0;

    // Check fingers based on joint angles
    const fingerJoints = [
        [INDEX_FINGER_MCP, INDEX_FINGER_PIP, INDEX_FINGER_TIP],
        [MIDDLE_FINGER_MCP, MIDDLE_FINGER_PIP, MIDDLE_FINGER_TIP],
        [RING_FINGER_MCP, RING_FINGER_PIP, RING_FINGER_TIP],
        [PINKY_MCP, PINKY_PIP, PINKY_TIP]
    ];

    for (const joint of fingerJoints) {
        const angle = getAngle(handLandmarks[joint[0]], handLandmarks[joint[1]], handLandmarks[joint[2]]);
        // If the angle is > 160, the finger is likely straight
        if (angle > 160) {
            raisedFingers++;
        }
    }
    
    // Thumb logic based on angle
    const thumbAngle = getAngle(handLandmarks[THUMB_CMC], handLandmarks[THUMB_MCP], handLandmarks[THUMB_IP]);
    // This angle threshold might need tuning. It checks if the thumb is extended outwards.
    if (thumbAngle > 150) { 
        raisedFingers++;
    }
    
    totalFingers += raisedFingers;
  }
  
  return totalFingers;
}
