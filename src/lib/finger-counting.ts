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

    // Define the angles for each finger when it's extended
    const fingerCurls = {
        thumb: getAngle(handLandmarks[THUMB_CMC], handLandmarks[THUMB_MCP], handLandmarks[THUMB_TIP]),
        index: getAngle(handLandmarks[INDEX_FINGER_MCP], handLandmarks[INDEX_FINGER_PIP], handLandmarks[INDEX_FINGER_TIP]),
        middle: getAngle(handLandmarks[MIDDLE_FINGER_MCP], handLandmarks[MIDDLE_FINGER_PIP], handLandmarks[MIDDLE_FINGER_TIP]),
        ring: getAngle(handLandmarks[RING_FINGER_MCP], handLandmarks[RING_FINGER_PIP], handLandmarks[RING_FINGER_TIP]),
        pinky: getAngle(handLandmarks[PINKY_MCP], handLandmarks[PINKY_PIP], handLandmarks[PINKY_TIP]),
    };

    // Check if fingers are straight (angle is high)
    if (fingerCurls.index > 160) raisedFingers++;
    if (fingerCurls.middle > 160) raisedFingers++;
    if (fingerCurls.ring > 160) raisedFingers++;
    if (fingerCurls.pinky > 160) raisedFingers++;

    // Thumb logic: Check for a wide angle indicating it's open.
    // This is more reliable across different hand rotations.
    if (fingerCurls.thumb > 150) {
        raisedFingers++;
    }
    
    totalFingers += raisedFingers;
  }
  
  return totalFingers;
}